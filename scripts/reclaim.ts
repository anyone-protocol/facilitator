import 'dotenv/config'
import { ethers } from 'hardhat';

import BigNumber from 'bignumber.js'

import { abi } from '../artifacts/contracts/Facility.sol/Facility.json'

interface RewardAllocationData {
  address: string
  amount: string
}

const reclaimData: RewardAllocationData[] = [
  {address: "0x6D454e61876334ee2Ca473E3b4B66777C931886E", amount: "25871132581137039505"}
]

async function main() {
  let facilityContractAddress = process.env.FACILITATOR_ADDRESS || 'Missing FACILITATOR_ADDRESS'

  let operatorKey = process.env.FACILITATOR_OPERATOR_KEY || "Missing FACILITATOR_OPERATOR_KEY"
  
  const provider = new ethers.JsonRpcProvider(process.env.JSON_RPC || 'http://127.0.0.1:8545/')
  const operator = new ethers.Wallet(operatorKey, provider)
  
  console.log(
    `Operating as ${operator.address} on facility: ${facilityContractAddress}`,
  )

  const facility = new ethers.Contract(facilityContractAddress, abi, operator.provider)
  const signerFacility = facility.connect(operator)
  
  for(let data of reclaimData) {
    try {
      const amount = BigNumber(data.amount).toFixed(0)
      const preAllocated = await signerFacility.allocatedTokens(data.address)
      console.log(`Tokens currently allocated in facility ${data.address}: ${preAllocated}`)
      const result = await signerFacility.updateAllocation(data.address, amount, true, { gasMultiplier: 5 })
      console.log(`updateAllocation for ${data.address} tx ${result.hash} waiting for confirmation...`)
      await result.wait()
      console.log(`updateAllocation tx ${result.hash} confirmed!`)
      const postAllocated = await signerFacility.allocatedTokens(data.address)
      console.log(`Tokens currently allocated in facility ${data.address}: ${postAllocated}`)
    } catch(error) {
      console.error('Failed updating allocation', error)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
