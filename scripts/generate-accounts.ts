import 'dotenv/config'
import { ethers, upgrades } from 'hardhat'
import Consul from "consul"

async function main() {
    const accountsCount = (process.env.PHASE !== undefined)? 50 : 1;

    const isLocal = (process.env.PHASE === undefined)
    
    let facilityAddress = (isLocal)? 
      process.env.FACILITY_CONTRACT_ADDRESS || '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318' :
      '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318'
      
    let consul
    const consulToken = process.env.CONSUL_TOKEN || undefined

    if (process.env.PHASE !== undefined && process.env.CONSUL_IP !== undefined) {
      console.log(`Connecting to Consul at ${process.env.CONSUL_IP}:${process.env.CONSUL_PORT}...`)
      consul = new Consul({
        host: process.env.CONSUL_IP,
        port: process.env.CONSUL_PORT,
      });

      facilityAddress = (await consul.kv.get({
        key: process.env.CONSUL_KEY || 'dummy-path',
        token: consulToken
      })).Value
    }
      
    const provider = 
    new ethers.JsonRpcProvider(
        (isLocal)? 'http://127.0.0.1:8545/' : 
            process.env.JSON_RPC || 'http://127.0.0.1:8545/'
    )

    const operator = new ethers.Wallet(
      process.env.FACILITY_OPERATOR_KEY || 
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // HH #1 
      provider
    )

    let accounts = await Promise.all(Array.from({ length: accountsCount }, async (_, index) => {
        const wallet = ethers.Wallet.createRandom()

        // Fund the account
        const fundTx = await operator.sendTransaction({
          to: wallet.address,
          value: BigInt(1e16),
        })
        const fundReceipt = await fundTx.wait()
        
        const budgetTx = await wallet.sendTransaction({
          to: facilityAddress,
          value: 9n * BigInt(1e16)
        })

        const budgetReceipt = await budgetTx.wait()

        console.log(`Iteration: ${index}\nWallet: ${wallet.privateKey}\nFund tx: ${fundReceipt.transactionHash}\nFund gas: ${fundReceipt.gasUsed}\nBudget tx: ${budgetReceipt.transactionHash}\nBudget gas: ${budgetReceipt.gasUsed}`)
      
        return wallet.privateKey
    }))
    
    if (process.env.PHASE !== undefined && process.env.CONSUL_IP !== undefined) {

      const updateResult = await consul.kv.set({
        key: process.env.TEST_ACCOUNTS_KEY || 'dummy-path',
        value: Buffer.from(JSON.stringify(accounts)).toString('base64'),
        token: consulToken
      })

      console.log(`Updated consul with result: ${updateResult}`)
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
