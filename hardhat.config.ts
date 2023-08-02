import "@nomicfoundation/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-chai-matchers";

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 5
      },
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      timeout: 6800000
    },
    goerli: {
      url: "https://ethereum-goerli.publicnode.com",
      accounts: [],
      timeout: 1800000
    },
    localhost: {
      timeout: 18000000
    }
  },
};

export default config;