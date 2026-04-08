import { ethers } from "ethers";

const DONATION_ABI = [
  "function donateToNGO(address ngoWallet,string campaignId) payable",
  "event DonationReceived(address indexed donor,address indexed ngo,uint256 amount,string campaignId,string txHashRef)",
];

export async function donateExample({
  rpcUrl,
  privateKey,
  contractAddress,
  ngoWallet,
  campaignId,
  amountEth,
}) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, DONATION_ABI, signer);

  const tx = await contract.donateToNGO(ngoWallet, campaignId, {
    value: ethers.parseEther(String(amountEth)),
  });
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}
