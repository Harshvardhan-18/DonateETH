import { ethers } from "ethers";

async function fetchWalletSentTransactions(walletAddress) {
  if (!walletAddress) return [];

  console.log(`Querying Blockscout for wallet: ${walletAddress}`);
  // Use Blockscout API for Sepolia
  const url = `https://eth-sepolia.blockscout.com/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log(`Etherscan response status: ${data.status}, message: ${data.message}`);

    if (data.status === "1" && Array.isArray(data.result)) {
      const sentTx = data.result
        .filter((tx) => tx.from.toLowerCase() === walletAddress.toLowerCase())
        .slice(0, 3);
      
      console.log(`Found ${sentTx.length} sent transactions.`);
      console.log(JSON.stringify(sentTx, null, 2));
      return sentTx;
    } else {
      console.log(`No transactions found or Etherscan error: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error("Error fetching wallet transactions from Etherscan:", error);
  }
  return [];
}

const ngoWallet = "0x73d267947636a32a6539753361a6c6e1ebdbc5c0";
fetchWalletSentTransactions(ngoWallet);
