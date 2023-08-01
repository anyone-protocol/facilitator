import 'dotenv/config'
import { ethers, upgrades } from 'hardhat'
import Consul from "consul"

async function main() {
  const consulToken = process.env.CONSUL_TOKEN || 'no-token'

  console.log(`Connecting to Consul at ${process.env.CONSUL_IP}:${process.env.CONSUL_PORT}...`)
  const consul = new Consul({
    host: process.env.CONSUL_IP,
    port: process.env.CONSUL_PORT,
  });

  const atorContractAddress: string = (await consul.kv.get({
    key: process.env.ATOR_TOKEN_KEY || 'dummy-path',
    token: consulToken
  })).Value

  console.log(`Deploying facility with ator contract: ${atorContractAddress}`)

  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY
  const [ owner ] = await ethers.getSigners()

  const deployer = deployerPrivateKey
    ? new ethers.Wallet(
        deployerPrivateKey,
        new ethers.JsonRpcProvider(process.env.JSON_RPC)
      )
    : owner
  
  console.log(`Deploying contract with deployer ${deployer.address}...`)
  
  const Contract = await ethers.getContractFactory('Facility', deployer)
  
  const instance = await upgrades.deployProxy(
    Contract,
    [ atorContractAddress ]
  )
  await instance.waitForDeployment()
  const proxyContractAddress = await instance.getAddress()
  console.log(`Proxy deployed to ${proxyContractAddress}`)

  // const result = await Contract.deploy()
  // await result.deployed()
  // console.log(`Contract deployed to ${result.address}`)


  if (process.env.PHASE !== undefined && process.env.CONSUL_IP !== undefined) {
    const consulKey = process.env.CONSUL_KEY || 'facilitator-goerli/test-deploy'

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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
