import 'dotenv/config'
import { ethers, upgrades } from 'hardhat'
import Consul from "consul"

async function main() {
    const isLocal = (process.env.PHASE === undefined)

    const facilitatorABI = [
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "_account",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "_value",
              "type": "uint256"
            }
          ],
          "name": "updateAllocation",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
      ]

    const provider = 
        new ethers.JsonRpcProvider(
            (isLocal)? 'http://127.0.0.1:8545/' : 
                process.env.JSON_RPC || 'http://127.0.0.1:8545/'
        )
    
    const [ owner, tester, dummy, ops ] = await ethers.getSigners() 

    const operator = (isLocal)? ops : new ethers.Wallet(
            process.env.FACILITY_OPERATOR_KEY || 'no-key', provider
      )

    let consul
    let accounts 
    const consulToken = process.env.CONSUL_TOKEN || undefined
    let facilityAddress = (isLocal)? 
      process.env.FACILITY_CONTRACT_ADDRESS || '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318' :
      '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318'
  
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

      const accountsData = await consul.kv.get({
        key: process.env.TEST_ACCOUNTS_KEY || 'dummy-path',
        token: consulToken
      }).Value

      const decodedValue = Buffer.from(accountsData, 'base64').toString('utf-8');
      accounts = JSON.parse(decodedValue) as string[];
    } else {
      accounts = ["0x46d0b30b82900bfc5b38069074ac8886830c15ed0e0e8134582f5537fb8e271a"]
    }

    console.log(`Operator ${operator.address} is updating allocation in facility ${facilityAddress}`)

    const contract = new ethers.Contract(facilityAddress, facilitatorABI, provider)

    const accountsCount = (process.env.PHASE !== undefined)? accounts.length : 1; 

    let index = 0
    while (index < accountsCount) {
      let allocation = 10_000 + index * 1000 + (Math.random() * 100)
      const tx = await contract.connect(operator).updateAllocation(
        new ethers.Wallet(accounts[index]), 
        ethers.parseUnits(allocation.toString()), true)

      const receipt = await tx.wait()
      
      console.log(`Iteration: ${index}\nTx: ${receipt.transactionHash}\nGas used: ${receipt.gasUsed}\nGas price: ${tx.gasPrice}`)
      
      index++
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
