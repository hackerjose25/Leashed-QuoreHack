// Usage: TOKEN=0x... OPERATOR=0x... npx hardhat run scripts/deploy.js --network qoreTestnet
// Deployer must have a registered ML-DSA-87 key and an open EVM window (contract creation allowed => no allowed_targets scope).
const { ethers } = require("hardhat");

async function main() {
  const { TOKEN, OPERATOR } = process.env;
  if (!TOKEN || !OPERATOR) throw new Error("Set TOKEN (fUSD ERC-20 address) and OPERATOR (agent 0x address)");
  const usd = (n) => ethers.parseUnits(String(n), Number(process.env.DECIMALS || 6));
  const vault = await (await ethers.getContractFactory("LeashedVault")).deploy(
    TOKEN, OPERATOR, usd(1000), usd(2000), usd(500)
  );
  await vault.waitForDeployment();
  console.log("LeashedVault:", vault.target);
}

main().catch((e) => { console.error(e); process.exit(1); });
