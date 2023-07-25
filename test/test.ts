import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'

const TokenContractAddress = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa'

describe("Facility contract", function () {

  async function deploy() {
    const Facility = await ethers.getContractFactory('Facility')
    const [ admin, tester ] = await ethers.getSigners()

    const facility = await upgrades.deployProxy(Facility, [TokenContractAddress])
    
    await facility.waitForDeployment()

    return { Facility, facility, admin, tester }
  }

  it('Deploys with a reference to provided token contract address', async () => {
    const { facility } = await loadFixture(deploy)
    expect(await facility.tokenContract()).to.equal(TokenContractAddress)
  })
  
  it('Updates token allocation for a given address', async () => {
    const { facility, admin, tester } = await loadFixture(deploy)    
    const newValue = 1_500_000

    await expect(
      facility.connect(admin).updateAllocation(tester.address, newValue)
    ).to.emit(facility, "AllocationUpdated")
      .withArgs(tester.address, newValue)
  })

  it('Emits an event requesting allocation update for a given address', async () => {
    const { facility, tester } = await loadFixture(deploy)
    
    const transferAmount = ethers.parseEther("0.0123");
    // Send ETH to the contract's address from tester
    await tester.sendTransaction({
      to: facility.getAddress(),
      value: transferAmount,
    });

    await expect(
        facility.connect(tester).requestUpdate()
      ).to.emit(facility, "RequestingUpdate")
        .withArgs(tester.address)
  })

  it('Allows claiming available tokens allocated to a given address')

  it('Ignores unauthorized token allocation updates')

  it('Prevents claiming tokens when not enough are available')

  it('Prevents claiming tokens when none are allocated')

  it('Prevents claiming tokens when already at limit')

});
