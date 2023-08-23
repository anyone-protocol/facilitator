import 'dotenv/config'
import { ethers } from 'hardhat';

import { abi } from '../artifacts/contracts/Facility.sol/Facility.json'

interface RewardAllocationData {
  address: string
  amount: string
}

const reclaimData: RewardAllocationData[] = [
  {address: "0x115afe7C1c388e541Bc2a3C7eF917Cc9d977EDdE", amount: "2884047985282285052441"},
  {address: "0xdc19bd7e2552EE5f60afe59D377282e10F702644", amount: "3421603402875919162763"},
  {address: "0xFb8fd61D5A4418e8E150Afd97CCD7Cc708C063a2", amount: "3349527222051208827047"}
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
    const amount: bigint = ethers.parseUnits(data.amount, 0)
    // const amount: bigint = BigInt(data.amount)
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
