import { ethers } from "ethers";
import { adminConfig } from "../config.js";

const DONATION_ABI = [
  "event DonationReceived(address indexed donor,address indexed ngo,uint256 amount,string campaignId,string txHashRef)",
];

export async function fetchRecentDonationEvents(fromBlock = -5000) {
  if (!adminConfig.rpcUrl || !adminConfig.donationContractAddress) {
    return [];
  }

  const provider = new ethers.JsonRpcProvider(adminConfig.rpcUrl);
  const contract = new ethers.Contract(adminConfig.donationContractAddress, DONATION_ABI, provider);
  const latestBlock = await provider.getBlockNumber();
  const startBlock = Math.max(0, latestBlock + fromBlock);
  const events = await contract.queryFilter("DonationReceived", startBlock, latestBlock);

  return events.map((evt) => ({
    donorWallet: evt.args?.donor,
    ngoWallet: evt.args?.ngo,
    amountEth: ethers.formatEther(evt.args?.amount ?? 0n),
    txHash: evt.transactionHash,
    blockNumber: evt.blockNumber,
    campaignId: evt.args?.campaignId ?? null,
  }));
}

export function etherscanTxUrl(txHash) {
  return `https://etherscan.io/tx/${txHash}`;
}
