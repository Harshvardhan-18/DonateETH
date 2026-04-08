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
import { useWriteContract } from "wagmi";
import { parseEther } from "viem"; // ✅ Converts ETH to Wei
import { contract } from "../../../../lib/contract";
import { apiUrl, assetUrl } from "@/lib/api";

export default function CampaignPage() {
  const router = useRouter();
  const { id } = useParams();
  const [campaignData, setCampaignData] = useState<any>(null);
  const [donationAmount, setDonationAmount] = useState("");
  const [milestones, setMilestones] = useState([]);

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

    console.log("contract address: ", contract.address)
    try {
      writeContract({
        address: contract.address as `0x${string}`, // ✅ Cast to `0x${string}` to avoid TS error
        abi: contract.abi,
        functionName: "donate",
        value: parseEther(donationAmount), // ✅ Convert ETH to Wei
        args: [
          campaignData.walletaddress as `0x${string}`, // Replace with real NGO Address
          campaignData.title, // Campaign Name
        ],
      });

      const response = await axios.post(apiUrl(`/campaigns/${campaignData.id}/updateRaised`), {amount: donationAmount}, {
          headers: {  
            'Content-Type': 'application/json'
          }
      });
      setCampaignData(response.data);
      console.log(response.data);
    } catch (err) {
      console.error("Error while donating:", err);
    }
  };

  if (!campaignData) {
    return <p className="text-center text-gray-500 mt-10">Loading...</p>;
  }

  const progress = (parseFloat(campaignData.raised || "0.0") / parseFloat(campaignData.goal || "1")) * 100;
  const campaignImageSrc = assetUrl(campaignData.imageUrl);
  
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
                {campaignData.donors} donors
              </span>
            </div>

            <Tabs defaultValue="about" className="mt-8">
              <TabsList>
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
                <TabsTrigger value="milestones">Donors</TabsTrigger>
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
              <TabsContent value="about">

                <p className="text-muted-foreground">
                  {campaignData.description}
                </p>
                
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24 p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {parseFloat(campaignData.raised || "0").toLocaleString()} ETH raised
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    of {parseFloat(campaignData.goal || "1").toLocaleString()} ETH goal
                  </p>
                </div>

                <Progress value={progress} />

                <div className="space-y-4">
                  <Input
                    type="number"
                    placeholder="Enter amount in ETH"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                  />
                  <Button className="w-full bg-green-300" size="lg"
                    onClick={handleDonate}
                    disabled={isPending}
                  >
                    {isPending ? "Processing..." : "Donate Now"}
                  </Button>
                  {isSuccess && <p className="text-green-500">Transaction Successful! 🎉</p>}
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
