import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'

describe("Facility contract", function () {

  async function deploy() {
    const Token = await ethers.getContractFactory('Token')
    const Facility = await ethers.getContractFactory('Facility')
    const [ admin, tester, operator ] = await ethers.getSigners()

    const token = await Token.deploy(100_000_000n * BigInt(10e18))
    const tokenContractAddress = await token.getAddress()

    const facility = await upgrades.deployProxy(
      Facility,
      [ tokenContractAddress, operator.address ]
    )
    await facility.waitForDeployment()
    const facilityTokenAddress = await facility.getAddress()

    return {
      Facility,
      facility,
      facilityTokenAddress,
      admin,
      tester,
      operator,
      token,
      tokenContractAddress
    }
  }

  it('Deploys with a reference to provided token contract address', async () => {
    const { facility, tokenContractAddress } = await loadFixture(deploy)
    expect(await facility.tokenContract()).to.equal(tokenContractAddress)
  })

  it('Emits an event when eth-for-gas budget is updated for a given address', async () => {
    const { facility, operator, tester } = await loadFixture(deploy)
    
    const previousBalance = await ethers.provider.getBalance(operator.address);

    const transferAmount = ethers.parseEther("0.0123");
    // Send ETH to the contract's address from tester
    await tester.sendTransaction({
      to: facility.getAddress(),
      value: transferAmount,
    });

    const newBalance = await ethers.provider.getBalance(operator.address);
    expect(newBalance).to.equal(transferAmount + previousBalance);

    // @ts-ignore
    await expect(facility.connect(tester).requestUpdate())
      .to.emit(facility, "RequestingUpdate")
      .withArgs(tester.address)
  })
  
  it('Reverts when requesting update and no eth-for-gas budget', async () => {
    const { facility, tester } = await loadFixture(deploy)
    
    // @ts-ignore
    await expect(facility.connect(tester).requestUpdate()).to.be.revertedWith(
      'Facility: requires user provided gas budget to create allocation updates'
    )
  })

  it('Requires available eth-for-gas to be greater than used to request update')
  
  it('Requires budget be greater than required amount to request update')

  it('Updates token allocation for a given address', async () => {
    const { facility, operator, tester } = await loadFixture(deploy)    
    const newValue = 1_500_100_900

    await expect(
      // @ts-ignore
      facility.connect(operator).updateAllocation(tester.address, newValue)
    ).to.emit(facility, "AllocationUpdated")
      .withArgs(tester.address, newValue)
  })

  it('Allows claiming tokens allocated to a given address', async () => {
    const {
      admin,
      facility,
      facilityTokenAddress,
      operator,
      tester,
      token 
    } = await loadFixture(deploy)
    const newValue = 1_500_300_500

    // @ts-ignore
    await token.connect(admin).transfer(
      facilityTokenAddress,
      2_000_000n * BigInt(10e18)
    )

    // @ts-ignore
    await facility.connect(operator).updateAllocation(tester.address, newValue)

    await expect(
      // @ts-ignore
      facility.connect(tester).claimAllocation()
    ).to.emit(facility, "AllocationClaimed")
      .withArgs(tester.address, newValue)
  })

  it('Ignores unauthorized token allocation updates')

  it('Prevents claiming tokens when not enough are available')

  it('Prevents claiming tokens when none are allocated')

  it('Prevents claiming tokens when already at limit')

});
