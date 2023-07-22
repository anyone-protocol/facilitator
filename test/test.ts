import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'

const TokenContractAddress = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa'

describe("Facility contract", function () {

  async function deploy() {
    const Facility = await ethers.getContractFactory('Facility')
    const [ admin, pauser, upgrader ] = await ethers.getSigners()
    
    const facility = await Facility.deploy(TokenContractAddress)

    await facility.waitForDeployment()

    return { Facility, facility, admin, pauser, upgrader }
  }

  it('Deploys with a reference to provided token contract address', async () => {
    const { facility } = await loadFixture(deploy)
    expect(await facility.tokenContract()).to.equal(TokenContractAddress)
  })

  it('Emits an event requesting allocation update for a given address')

  it('Allows updating token allocation for a given address')

  it('Ignores unauthorized token allocation updates')

  it('Allows claiming available tokens allocated to a given address')

  it('Prevents claiming tokens when not enough are available')

  it('Prevents claiming tokens when none are allocated')

  it('Prevents claiming tokens when already at limit')  

});
