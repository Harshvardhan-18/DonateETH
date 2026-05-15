import { ethers } from "ethers";
import { adminConfig } from "../config.js";

const DONATION_ABI = [
  "event DonationReceived(address indexed donor,address indexed ngo,uint256 amount,string campaignId,string txHashRef)",
];

const WITHDRAWAL_ABI = [
  "event FundsWithdrawn(address indexed ngo,uint256 amount)",
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

export async function fetchRecentWithdrawalEvents(fromBlock = -200000) {
  if (!adminConfig.rpcUrl || !adminConfig.donationContractAddress) {
    return [];
  }

  const provider = new ethers.JsonRpcProvider(adminConfig.rpcUrl);
  const contract = new ethers.Contract(adminConfig.donationContractAddress, WITHDRAWAL_ABI, provider);
  const latestBlock = await provider.getBlockNumber();
  const startBlock = Math.max(0, latestBlock + fromBlock);
  const events = await contract.queryFilter("FundsWithdrawn", startBlock, latestBlock);

  return events.map((evt) => ({
    ngoWallet: evt.args?.ngo,
    amountEth: ethers.formatEther(evt.args?.amount ?? 0n),
    txHash: evt.transactionHash,
    blockNumber: evt.blockNumber,
  }));
}

export function etherscanTxUrl(txHash) {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

export async function fetchWalletSentTransactions(walletAddress) {
  if (!walletAddress) return [];

  // Use Blockscout API for Sepolia to fetch normal transactions
  const url = `https://eth-sepolia.blockscout.com/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      return data.result
        .filter((tx) => tx.from.toLowerCase() === walletAddress.toLowerCase())
        .slice(0, 3)
        .map((tx) => ({
          id: tx.hash,
          ngoWallet: tx.from,
          to: tx.to,
          amountEth: ethers.formatEther(tx.value),
          txHash: tx.hash,
          blockNumber: tx.blockNumber,
          direction: "sent",
          timestamp: tx.timeStamp,
        }));
    }
  } catch (error) {
    console.error("Error fetching wallet transactions from Blockscout:", error);
  }
  return [];
}
