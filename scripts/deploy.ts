import 'dotenv/config'
import { ethers, upgrades } from 'hardhat'
import Consul from "consul"

async function main() {
  let consul
  const consulToken = process.env.CONSUL_TOKEN || undefined
  let anyoneAddress = process.env.ATOR_TOKEN_CONTRACT_ADDRESS

  if (process.env.PHASE !== undefined && process.env.CONSUL_IP !== undefined) {
    console.log(`Connecting to Consul at ${process.env.CONSUL_IP}:${process.env.CONSUL_PORT}...`)
    consul = new Consul({
      host: process.env.CONSUL_IP,
      port: process.env.CONSUL_PORT,
    });

    anyoneAddress = (await consul.kv.get({
      key: process.env.ATOR_TOKEN_CONSUL_KEY || 'dummy-path',
      token: consulToken
    })).Value
  }

  console.log(`Deploying facility with anyone: ${anyoneAddress}`)

  const deployerPrivateKey = process.env.FACILITATOR_DEPLOYER_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' // HH #1
  const [ owner ] = await ethers.getSigners()

  const deployer = deployerPrivateKey
    ? new ethers.Wallet(
        deployerPrivateKey,
        new ethers.JsonRpcProvider(process.env.JSON_RPC)
      )
    : owner
  
  const operatorAddress = process.env.FACILITATOR_OPERATOR_ADDRESS || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' // Hardhat #2 

  console.log(`Deploying facility with operator ${operatorAddress}...`)
  
  console.log(`Deploying facility with deployer ${deployer.address}...`)
  
  const Contract = await ethers.getContractFactory('Facility', deployer)
  
  const instance = await upgrades.deployProxy(
    Contract,
    [ anyoneAddress, operatorAddress ]
  )
  await instance.waitForDeployment()
  const proxyContractAddress = await instance.getAddress()
  console.log(`Proxy deployed to ${proxyContractAddress}`)

  if (process.env.PHASE !== undefined && process.env.CONSUL_IP !== undefined) {
    const consulKey = process.env.FACILITATOR_CONSUL_KEY || 'facilitator-goerli/test-deploy'

    const updateResult = await consul.kv.set({
      key: consulKey,
      value: proxyContractAddress,
      token: consulToken
    });
    console.log(`Cluster variable updated: ${updateResult}`)
  } else {
    console.warn('Deployment env var PHASE not defined, skipping update of cluster variable in Consul.')
  }

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
