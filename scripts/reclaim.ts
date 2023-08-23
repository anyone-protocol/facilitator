import 'dotenv/config'
import { ethers } from 'hardhat';

import BigNumber from 'bignumber.js'

import { abi } from '../artifacts/contracts/Facility.sol/Facility.json'

interface RewardAllocationData {
  address: string
  amount: string
}

const reclaimData: RewardAllocationData[] = [
  {address: "0xEa4D2fC12d2EE706070E89C89F19Dcdd84Be39Fd", amount: "3.268551484090229528753e+21"}
]

async function main() {
  let facilityContractAddress = process.env.FACILITY_CONTRACT_ADDRESS || 'Missing FACILITY_CONTRACT_ADDRESS'

  let operatorKey = process.env.FACILITY_OPERATOR_KEY || "Missing FACILITY_OPERATOR_KEY"
  
  const provider = new ethers.JsonRpcProvider(process.env.JSON_RPC || 'http://127.0.0.1:8545/')
  const operator = new ethers.Wallet(operatorKey, provider)
  
  console.log(
    `Operating as ${operator.address} on facility: ${facilityContractAddress}`,
  )

  const facility = new ethers.Contract(facilityContractAddress, abi, operator.provider)
  const signerFacility = facility.connect(operator)
  
  for(let data of reclaimData) {
    const amount = BigNumber(data.amount).toFixed()
    
    const result = await signerFacility.updateAllocation(data.address, amount, true)
    console.log(`updateAllocation tx ${result.hash} waiting for confirmation...`)
    await result.wait()
    console.log(`updateAllocation tx ${result.hash} confirmed!`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
