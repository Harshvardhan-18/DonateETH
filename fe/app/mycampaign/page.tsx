"use client";

import { Navbar } from "@/components/navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { CampaignCard, CampaignCard2 } from "@/components/campaign-card";
import { motion } from "framer-motion";
import { useAccount, useConnect } from "wagmi";
import { apiUrl } from "@/lib/api";

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  interface Campaign {
    id: string;
    title: string;
    description: string;
    walletaddress: string;
  }

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showMyCampaigns, setShowMyCampaigns] = useState(false);
  const [ngoAllowed, setNgoAllowed] = useState(false);
  const [isNgoChecking, setIsNgoChecking] = useState(false);

  // Using wagmi hooks for wallet connection
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch(apiUrl("/campaigns"));
        if (!response.ok) {
          throw new Error("Failed to fetch campaigns");
        }
        const data = await response.json();
        console.log(data)
        console.log(data);
        setCampaigns(data);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
      }
    };
    fetchCampaigns();
  }, [isConnected]);

  useEffect(() => {
    const checkNgo = async () => {
      // Wagmi can briefly report `isConnected=false` during reconnect.
      // If we already have an address, we can still check approval.
      if (!address) {
        setNgoAllowed(false);
        setShowMyCampaigns(false);
        return;
      }

      setIsNgoChecking(true);
      try {
        const walletAddress = address.toLowerCase();
        const res = await fetch(apiUrl(`/ngos/me?walletAddress=${walletAddress}`), { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to check NGO status");
        const data = await res.json();
        const allowed = Boolean(data.allowed);
        setNgoAllowed(allowed);
        setShowMyCampaigns(allowed);
      } catch {
        setNgoAllowed(false);
        setShowMyCampaigns(false);
      } finally {
        setIsNgoChecking(false);
      }
    };

    checkNgo();
  }, [address]);

  const connectWallet = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    } else {
      alert("No wallet connectors available");
    }
  };

  // Filter campaigns to show either all campaigns or only those matching the connected wallet
  const filteredCampaigns = campaigns.filter(campaign => {
    // Apply search filter
    const matchesSearch = campaign.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Only show campaigns matching the wallet address if showMyCampaigns is true
    const connectedWallet = address?.toLowerCase();
    const matchesWallet =
      !showMyCampaigns ||
      (Boolean(connectedWallet) && campaign.walletaddress?.toLowerCase() === connectedWallet);
    
    return matchesSearch && matchesWallet;
  });

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="w-full pt-24">
        <div className="flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-4xl font-bold "
          >
            {showMyCampaigns ? "My Campaigns" : "All Campaigns"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mt-2 text-lg text-muted-foreground"
          >
            {isConnected
              ? ngoAllowed
                ? showMyCampaigns
                  ? "View and manage your active donation campaigns."
                  : "Browse all available donation campaigns."
                : "Browse all available donation campaigns."
              : "Connect your wallet to view your campaigns."}
          </motion.p>

          {isConnected && !isNgoChecking && !ngoAllowed ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-2 text-sm text-yellow-700"
            >
              Only registered and approved NGOs can manage “My Campaigns”. Please register at{" "}
              <a className="underline" href="/ngos">/ngos</a>.
            </motion.p>
          ) : null}
        </div>

        {/* Search, Filter, and Wallet Section */}
        <div className="flex w-full justify-center">
          {!isConnected ? (
            <div className="mt-8">
              <Button onClick={connectWallet} className="gap-2">
                Connect Wallet
              </Button>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap gap-4 w-6/12">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search campaigns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant={showMyCampaigns ? "default" : "outline"} 
                disabled={!ngoAllowed || isNgoChecking}
                onClick={() => setShowMyCampaigns(true)}
                className="w-[180px]"
              >
                My Campaigns
              </Button>
              <Button 
                variant={!showMyCampaigns ? "default" : "outline"} 
                onClick={() => setShowMyCampaigns(false)}
                disabled={isNgoChecking}
                className="w-[180px]"
              >
                All Campaigns
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Full-width Campaigns Grid */}
      <div className="w-full px-20 mt-8">
        {!isConnected ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              Connect your wallet to view your campaigns
            </p>
          </div>
        ) : filteredCampaigns.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {filteredCampaigns.map((campaign: any) => (
              <CampaignCard2 key={campaign?.id} campaign={campaign} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              {showMyCampaigns 
                ? "You don't have any campaigns associated with your wallet address." 
                : "No campaigns found matching your search criteria."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}