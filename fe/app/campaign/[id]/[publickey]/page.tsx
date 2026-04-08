"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import { useAccount, useWriteContract } from "wagmi";
import { contract } from "../../../../lib/contract";
import { apiUrl, assetUrl } from "@/lib/api";

export default function CampaignPage() {
  const router = useRouter();
  const { id } = useParams();
  const { address } = useAccount();
  const [campaignData, setCampaignData] = useState<any>(null);
  const [donorName, setDonorName] = useState("");
  const [donationAmount, setDonationAmount] = useState("");
  const [milestones, setMilestones] = useState([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [isDonating, setIsDonating] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(false);

  // ✅ useWriteContract should be at the top level
  const { data, isPending, isSuccess, writeContract } = useWriteContract();

  useEffect(() => {
    async function fetchCampaign() {
      try {
        const response = await axios.get(apiUrl(`/campaigns/${id}`));
        if (response.data) {
          console.log(response.data);
          setCampaignData(response.data);
        }

        const response2 = await axios.get(apiUrl("/milestones"));
        if (response2.data) {
          setMilestones(response2.data);
        }

        const response3 = await axios.get(apiUrl(`/campaigns/${id}/donations`));
        if (response3.data) {
          setDonations(response3.data);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }

    if (id) fetchCampaign();
  }, [id]);

  const handleDonate = async () => {
    if (!donationAmount) {
      alert("Please enter a donation amount!");
      return;
    }
    if (!donorName.trim()) {
      alert("Please enter your name!");
      return;
    }
    if (!address) {
      alert("Please connect your wallet!");
      return;
    }

    console.log("contract address: ", contract.address)
    try {
      setIsDonating(true);
      setDonationSuccess(false);

      const response = await axios.post(
        apiUrl(`/campaigns/${campaignData.id}/updateRaised`),
        {
          amount: donationAmount,
          donorWallet: address,
          donorName: donorName.trim(),
          txHash: `offchain-${campaignData.id}-${Date.now()}`,
        },
        {
          headers: {  
            'Content-Type': 'application/json'
          }
        }
      );
      setCampaignData(response.data);
      const donationsRes = await axios.get(apiUrl(`/campaigns/${campaignData.id}/donations`));
      setDonations(donationsRes.data || []);
      setDonationSuccess(true);
      console.log(response.data);
    } catch (err) {
      console.error("Error while donating:", err);
    } finally {
      setIsDonating(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      writeContract({
        address: contract.address as `0x${string}`,
        abi: contract.abi,
        functionName: "withdraw",
        args: [BigInt(Math.round(0.0001 * 1e18))],
      });
    } catch (err) {
      console.error("Error while withdrawing:", err);
    }
  };

  if (!campaignData) {
    return <p className="text-center text-gray-500 mt-10">Loading...</p>;
  }

  const totalDonatedEth = donations.reduce((sum, tx) => sum + Number(tx?.amountEth || 0), 0);
  const uniqueDonors = new Set(donations.map((tx) => String(tx?.donorWallet || "").toLowerCase()).filter(Boolean)).size;
  const fallbackRaised = Number(campaignData.raised || 0);
  const effectiveRaised = totalDonatedEth > 0 ? totalDonatedEth : fallbackRaised;
  const goalEth = Number(campaignData.goal || 0);
  const progress = goalEth > 0 ? Math.min(100, (effectiveRaised / goalEth) * 100) : 0;
  const campaignImageSrc = assetUrl(campaignData.imageUrl);
  const isCampaignOwner =
    Boolean(address) &&
    String(address).toLowerCase() === String(campaignData?.walletaddress || "").toLowerCase();
  
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="w-full pt-24">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 pl-12 mb-20">
            <div className="p-4 pl-0 rounded-lg shadow-md">
              <div className="relative aspect-video overflow-hidden rounded-lg">
                <img
                  src={campaignImageSrc}
                  alt={campaignData.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <h1 className="mt-6 text-3xl font-bold">{campaignData.title}</h1>
            <div className="mt-4 flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center">
                <Clock className="mr-1 h-4 w-4" />
                {campaignData.daysLeft} days left
              </span>
              <span className="flex items-center">
                <Users className="mr-1 h-4 w-4" />
                {uniqueDonors} donors
              </span>
            </div>

            <Tabs defaultValue="about" className="mt-8">
              <TabsList>
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
                <TabsTrigger value="donors">Donors</TabsTrigger>
              </TabsList>

              <TabsContent value="about">
                <p className="text-muted-foreground">
                  {campaignData.description}
                </p>
              </TabsContent>

              <TabsContent value="milestones">
                <div className="space-y-4">
                  {milestones.map((milestone: any, index: number) => (
                    milestone.campaignId === campaignData.id && (
                    <Card key={index} className="p-4 border-2 border-transparent hover:border-gray-300">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{milestone.title}</p>
                          <p className="text-sm text-muted-foreground">₹{milestone.amount}</p>
                        </div>
                        {milestone.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    </Card>
                    )
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="donors">
                <div className="space-y-3">
                  {donations.map((tx) => (
                    <Card key={tx.id} className="p-4">
                      <p className="text-sm">
                        <span className="font-medium">Donor:</span> {tx.donorName || tx.donorWallet}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Amount:</span> {Number(tx.amountEth || 0).toFixed(4)} ETH
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ""}
                      </p>
                    </Card>
                  ))}
                  {donations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No donations yet.</p>
                  ) : null}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24 p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {effectiveRaised.toLocaleString()} ETH raised
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    of {goalEth.toLocaleString()} ETH goal
                  </p>
                </div>

                <Progress value={progress} />

                <div className="space-y-4">
                  {isCampaignOwner ? (
                    <Button className="w-full bg-green-300" size="lg" onClick={handleWithdraw} disabled={isPending}>
                      {isPending ? "Processing..." : "Withdraw"}
                    </Button>
                  ) : (
                    <>
                      <Input
                        type="text"
                        placeholder="Enter your name"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Enter amount in ETH"
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                      />
                      <Button className="w-full bg-green-300" size="lg" onClick={handleDonate} disabled={isDonating}>
                        {isDonating ? "Processing..." : "Donate Now"}
                      </Button>
                    </>
                  )}
                  {(isSuccess || donationSuccess) && <p className="text-green-500">Transaction Successful! 🎉</p>}
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Secured by blockchain technology
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
