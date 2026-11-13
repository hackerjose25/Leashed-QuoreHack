require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const accounts = process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    // Every EVM tx from an account needs a registered ML-DSA-87 key + an open EVM window (see docs/ARCHITECTURE.md).
    qoreTestnet: {
      url: process.env.QORE_EVM_RPC || "https://evm-testnet.qore.host",
      chainId: 9800,
      accounts,
    },
  },
};
