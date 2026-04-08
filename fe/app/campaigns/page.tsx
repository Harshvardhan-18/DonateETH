"use client";

import { Navbar } from "@/components/navbar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useState } from "react";
import { CampaignCard } from "@/components/campaign-card";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { apiUrl } from "@/lib/api";


export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch(apiUrl("/campaigns"));
        if (!response.ok) {
          throw new Error("Failed to fetch campaigns");
        }
        const data = await response.json();
        console.log(data)
        setCampaigns(data);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
      }
    };
    fetchCampaigns();
  }, []);

  console.log(campaigns)

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
            Active Campaigns
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
            className="mt-2 text-lg text-muted-foreground"
          >
            Every contribution makes a difference. Support a cause that matters
            to you.
          </motion.p>
        </div>

        {/* Search and Filter Section */}
        <div className="flex w-full justify-center">
          <div className="mt-8 flex flex-wrap gap-4 w-6/12 ">
            <div className="flex-1 ">
              <div className="relative ">
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
                <SelectItem value="verified">Verified Only</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Full-width Campaigns Grid */}
      <div className="w-full px-20 mt-8">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {campaigns.map((campaign: any) => (
            
            <CampaignCard key={campaign?.id} campaign={campaign} />
          ))}
        </div>
      </div>
    </main>
  );
}