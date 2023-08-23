import 'dotenv/config'
import '@nomiclabs/hardhat-ethers'

import Consul from "consul"

import { Contract, LoggerFactory, Warp, WarpFactory } from 'warp-contracts';
import { StateUpdatePlugin } from 'warp-contracts-subscription-plugin';
import { EthersExtension } from 'warp-contracts-plugin-ethers';
import {
    buildEvmSignature,
    EvmSignatureVerificationServerPlugin,
    // @ts-ignore
} from 'warp-contracts-plugin-signature/server'

import { abi } from '../artifacts/contracts/Facility.sol/Facility.json'
import { DistributionState } from './interfaces/distribution';
import { Claimable } from './interfaces/relay-registry';
import ethers from 'ethers';

interface RewardAllocationData {
  address: string
  amount: string
}

const reclaimAddress = [
  "0x115afe7C1c388e541Bc2a3C7eF917Cc9d977EDdE",
  "0xdc19bd7e2552EE5f60afe59D377282e10F702644",
  "0xFb8fd61D5A4418e8E150Afd97CCD7Cc708C063a2"
]

async function getAllocation(distribution: Contract<DistributionState>, signer: ethers.Wallet, address: string): Promise<RewardAllocationData | undefined> {
  const evmSig = await buildEvmSignature(signer)
  const response = await distribution
      .connect({
          signer: evmSig,
          type: 'ethereum',
      })
      .viewState<
          Claimable,
          string
      >({
          function: 'claimable',
          address: address,
      })
  
  if (response.result == undefined) {
      console.error(`Failed to fetch distribution state: ${response.errorMessage}`)
      return undefined
  } else {
      return {
          address: address,
          amount: response.result
      }
  }
}

async function main() {
  let facilityContractAddress
  let distributionContractAddress

  const consulToken = process.env.CONSUL_TOKEN
  if (consulToken !== undefined) {
    console.log(`Connecting to Consul at ${process.env.CONSUL_IP}:${process.env.CONSUL_PORT}...`)
    const consul = new Consul({
      host: process.env.CONSUL_IP,
      port: process.env.CONSUL_PORT,
    });

    facilityContractAddress = (await consul.kv.get<{ Value: string }>({
      key: process.env.FACILITY_CONTRACT_KEY || 'dummy-path',
      token: consulToken
    })).Value

    distributionContractAddress = (await consul.kv.get<{ Value: string }>({
      key: process.env.DISTRIBUTION_CONTRACT_KEY || 'dummy-path',
      token: consulToken
    })).Value
  }

  const warp = WarpFactory.forMainnet({
      inMemory: true,
      dbLocation: '-distribution',
  })
      .use(new EthersExtension())
      .use(new EvmSignatureVerificationServerPlugin())
  
  warp.use(new StateUpdatePlugin(distributionContractAddress, warp))
  
  const operatorKey = process.env.FACILITY_OPERATOR_KEY
  if (operatorKey !== undefined) {
    const operatorAr = new ethers.Wallet(operatorKey)
    
    const operatorEvm = new ethers.Wallet(operatorKey,
      new ethers.JsonRpcProvider(process.env.JSON_RPC || 'http://127.0.0.1:8545/')
    )
    
    console.log(
      `Operating as ${operatorAr.address} on:\n- distribution: ${distributionContractAddress}\n- facility: ${facilityContractAddress}\n`,
    )
  
    const distribution = warp.contract<DistributionState>(distributionContractAddress)

    const facility = new ethers.Contract(facilityContractAddress, abi, operatorEvm.provider)
    const signerFacility = facility.connect(operatorEvm)
    
    for(let fixAddress in reclaimAddress) {
      const allocation = await getAllocation(distribution, operatorAr, fixAddress)
      const safeAllocation = ethers.parseUnits(allocation?.amount || "0", 0)
      console.log(`Received allocation amount for ${allocation?.address}: ${safeAllocation}`)

      if (allocation != undefined && allocation.address != undefined && safeAllocation > 0) {
        const result = await signerFacility.updateAllocation(allocation.address, safeAllocation, true)
        console.log(`updateAllocation tx ${result.hash} waiting for confirmation...`)
        await result.wait()
        console.log(`updateAllocation tx ${result.hash} confirmed!`)
  
      } else console.error('Missing allocation data or allocation of zero')
    }
  } else {
    console.error('Missing FACILITY_OPERATOR_KEY')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
