import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'

describe("Facility contract", function () {

  async function deploy() {
    const Token = await ethers.getContractFactory('Token')
    const Facility = await ethers.getContractFactory('Facility')
    const [ admin, tester, operator ] = await ethers.getSigners()

    const token = await Token.deploy(100_000_000n * BigInt(10e18))
    const tokenAddress = await token.getAddress()

    const facility = await upgrades.deployProxy(
      Facility,
      [ tokenAddress, operator.address ]
    )
    await facility.waitForDeployment()
    const facilityAddress = await facility.getAddress()

    return {
      Facility,
      facility,
      facilityAddress,
      admin,
      tester,
      operator,
      token,
      tokenAddress
    }
  }

  it('Deploys with a reference to provided token contract address', async () => {
    const { facility, tokenAddress } = await loadFixture(deploy)
    expect(await facility.tokenAddress()).to.equal(tokenAddress)
  })

  it('Emits an event when the gas budget is updated for a given address', async () => {
    const { facility, operator, tester } = await loadFixture(deploy)

    // @ts-ignore
    await expect(
      await tester.sendTransaction({
        to: facility.getAddress(),
        value: ethers.parseEther("0.0123"),
      })
    ).to.emit(facility, "RequestingUpdate")
      .withArgs(tester.address)
  })
  
  it('Reverts when requesting update and no user provided budget', async () => {
    const { facility, tester } = await loadFixture(deploy)
    
    // @ts-ignore
    await expect(tester.sendTransaction({
      to: facility.getAddress(),
      value: 0,
    })).to.be.revertedWith(
      'Facility: no user provided budget, send ETH to contract address to refill'
    )
  })

  it('Reverts when requesting update and not enough user provided budget', async () => {
    const { facility, tester } = await loadFixture(deploy)
    
    // @ts-ignore
    await expect(tester.sendTransaction({
      to: facility.getAddress(),
      value: 1,
    })).to.be.revertedWith(
      'Facility: not enough user provided budget, send ETH to contract address to refill'
    )
  })

  it('Sends received gas budget to the operator', async () => {
    const { facility, operator, tester } = await loadFixture(deploy)

    const previousBalance = await ethers.provider.getBalance(operator.address)

    const value = ethers.parseEther('0.0123')
    // @ts-ignore
    await expect(tester.sendTransaction({
      to: facility.getAddress(),
      value: value,
    }))
      .to.emit(facility, 'RequestingUpdate')
      .withArgs(tester.address)

    const newBalance = await ethers.provider.getBalance(operator.address)
    expect(newBalance).to.equal(value + previousBalance)
  })

  it('Updates token allocation for a given address, tracking budget', async () => {
    const { facility, facilityAddress, operator, admin, tester, token } = await loadFixture(deploy)    
    const newValue = 1_500_100_900
    
    
    // @ts-ignore
    await token.connect(admin).transfer(
      facilityAddress,
      2_000_000n * BigInt(10e18)
    )

    await expect(
      // @ts-ignore
      facility.connect(operator).updateAndClaim(tester.address, newValue)
    ).to.emit(facility, "AllocationUpdated")
      .withArgs(tester.address, newValue)

    const GAS_PRICE: bigint = await facility.GAS_PRICE()
    const GAS_COST: bigint = await facility.GAS_COST()
    const requiredBudget = GAS_PRICE * GAS_COST

    const operatorUsedBudget = await facility.usedBudget(operator.address)
    expect(operatorUsedBudget).to.equal(0n)
    const testerUsedBudget = await facility.usedBudget(tester.address)
    expect(testerUsedBudget).to.equal(requiredBudget)
  })

  it('Updates the log and delivers claimable tokens in one step', async() => {
    const {
      admin,
      facility,
      facilityAddress,
      operator,
      tester,
      token 
    } = await loadFixture(deploy)
    const newValue = 1_500_300_500

    // @ts-ignore
    await token.connect(admin).transfer(
      facilityAddress,
      2_000_000n * BigInt(10e18)
    )

    await tester.sendTransaction({
      to: facility.getAddress(),
      value: 1n * BigInt(10e18),
    });

    await expect(
      // @ts-ignore
      await facility.connect(operator).updateAndClaim(tester.address, newValue)
    ).to.emit(facility, "AllocationClaimed")
      .withArgs(tester.address, newValue)
  })

  it('Ignores unauthorized token allocation updates',async () => {
    const { facility, operator, tester } = await loadFixture(deploy)    
    const newValue = 1_500_100_900
    
    await expect(
      // @ts-ignore
      facility.connect(tester).updateAndClaim(tester.address, newValue)
    ).to.be.revertedWith(`AccessControl: account ${tester.address.toLowerCase()} is missing role 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929`)
  })

  it('Prevents claiming tokens when not enough tokens to claim', async () => {
    const {
      admin,
      facility,
      facilityAddress,
      operator,
      tester,
      token 
    } = await loadFixture(deploy)
    
    // @ts-ignore
    await token.connect(admin).transfer(
      facilityAddress,
      100n
    )

    await tester.sendTransaction({
      to: facility.getAddress(),
      value: 1n * BigInt(10e18),
    });

    await expect(
      // @ts-ignore
      facility.connect(operator).updateAndClaim(tester.address, 500)
    ).to.be.revertedWith('Facility: not enough tokens to claim')
  })

  it('Prevents claiming tokens when no tokens allocated for sender', async () => {
    const {
      admin,
      facility,
      facilityAddress,
      operator,
      tester,
      token 
    } = await loadFixture(deploy)

    // @ts-ignore
    await token.connect(admin).transfer(
      facilityAddress,
      100n
    )

    await expect(
      // @ts-ignore
      facility.connect(operator).updateAndClaim(tester.address, 0)
    ).to.be.revertedWith('Facility: no tokens allocated for sender')
  })

  it('Prevents claiming tokens when already at limit',async () => {
    const {
      admin,
      facility,
      facilityAddress,
      operator,
      tester,
      token 
    } = await loadFixture(deploy)
    const newValue = 1_500

    // @ts-ignore
    await token.connect(admin).transfer(
      facilityAddress,
      100n * BigInt(1e18)
    )

    await expect(
      // @ts-ignore
      facility.connect(operator).updateAndClaim(tester.address, newValue)
    ).to.emit(facility, "AllocationClaimed")
      .withArgs(tester.address, newValue)


    await expect(
      // @ts-ignore
      facility.connect(operator).updateAndClaim(tester.address, newValue)
    ).to.be.revertedWith('Facility: no tokens available to claim')
  })

});
