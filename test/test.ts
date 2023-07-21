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

});
