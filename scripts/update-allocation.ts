import 'dotenv/config'
import { ethers, upgrades } from 'hardhat'

async function main() {
    const isLocal = true

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

    const facilityAddress = (isLocal)? 
        process.env.FACILITY_CONTRACT_ADDRESS || '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318' :
        '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318'

    console.log(`Operator ${operator.address} is updating allocation in facility ${facilityAddress}`)

    const contract = new ethers.Contract(facilityAddress, facilitatorABI, provider)

    const tx = await contract.connect(operator).updateAllocation(operator.address, ethers.parseUnits("1000"))
    const receipt = await tx.wait();
    console.log("Transaction hash:", receipt.transactionHash);

    const gasUsed: bigint = receipt.gasUsed;
    const gasPrice: bigint = tx.gasPrice;
    console.log("Gas used:", gasUsed.toString());
    console.log("Gas price:", gasPrice.toString());
    
    if (gasUsed != undefined && gasPrice != undefined) {
        const gasCost: bigint = gasUsed * gasPrice;
        console.log("Total gas cost:", gasCost.toString(), "Wei");
        console.log("Total gas cost:", ethers.formatEther(gasCost), "Ether");
    }

    
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
