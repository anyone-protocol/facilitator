import 'dotenv/config'
import { ethers, upgrades } from 'hardhat'

async function main() {
  const ATOR_TOKEN_CONTRACT_ADDRESS = process.env.ATOR_TOKEN_CONTRACT_ADDRESS || ''
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
    [ ATOR_TOKEN_CONTRACT_ADDRESS ]
  )
  await instance.waitForDeployment()
  console.log(`Proxy deployed to ${await instance.getAddress()}`)

  // const result = await Contract.deploy()
  // await result.deployed()
  // console.log(`Contract deployed to ${result.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
