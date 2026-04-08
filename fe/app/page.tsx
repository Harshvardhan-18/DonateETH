"use client"
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { ArrowRight, Shield, LineChart, Vote } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { apiUrl, assetUrl } from "@/lib/api";

type Campaign = {
  id: string;
  walletaddress?: string | null;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  raised?: string | number | null;
  goal?: string | number | null;
  daysLeft?: number | null;
  isActive?: boolean | null;
};

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch(apiUrl("/campaigns"), { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to fetch campaigns");
        const data = await response.json();
        setCampaigns(Array.isArray(data) ? data : []);
      } catch {
        setCampaigns([]);
      }
    };
    fetchCampaigns();
  }, []);

  const activeCampaigns = useMemo(() => {
    return campaigns
      .filter((campaign) => campaign?.isActive !== false)
      .slice(0, 3);
  }, [campaigns]);

  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-4 pt-32 pb-16 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Empowering Transparent
          <br />
          <span className="text-primary">Donations with Blockchain</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mt-4 max-w-[700px] text-lg text-muted-foreground"
        >
          Track every rupee you donate with 100% transparency. Powered by
          blockchain technology for maximum security and accountability.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mt-8 flex gap-4"
        >
          <Link href="/campaigns">
            <Button
              size="lg"
              className="hover:bg-white hover:text-black transition duration-700 ease-in-out border-2 border-transparent border-black dark:hover:bg-black dark:hover:text-white dark:hover:border-white flex hover:gap "
            >
              <span className="">Explore Campaigns</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="hover:bg-gray-500 transition duration-300 ease-in-out"
          >
            Learn More
          </Button>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="flex flex-col items-center justify-center px-10 pt-24 pb-16 text-center">
        <div className="grid gap-8 md:grid-cols-3 ">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center text-center rounded-xl hover:border hover:border-white/20 hover:bg-white/10  hover:backdrop-blur-lg shadow-lg p-6 transition duration-00 ease-out"
          >
            <div className="mb-8 rounded-full bg-primary/10 p-4">
              <LineChart className="h-6 w-6 text-primary " />
            </div>
            <h3 className="mb-1 text-xl font-semibold">Real-time Tracking</h3>
            <p className="text-muted-foreground py-3 px-12">
              Monitor donations and fund usage in real-time with blockchain
              transparency.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center text-center rounded-xl hover:border hover:border-white/20 hover:bg-white/10  hover:backdrop-blur-lg shadow-lg p-6 transition duration-500 ease-out"
          >
            <div className="mb-8 rounded-full bg-primary/10 p-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-1 text-xl font-semibold">
              Smart Contract Security
            </h3>
            <p className="text-muted-foreground py-3 px-12">
              Your donations are secured by immutable smart contracts on the
              blockchain.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center text-center rounded-xl hover:border hover:border-white/20 hover:bg-white/10  hover:backdrop-blur-lg shadow-lg p-6 transition duration-500 ease-out"
          >
            <div className="mb-8 rounded-full bg-primary/10 p-4">
              <Vote className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-1 text-xl font-semibold">Donor Governance</h3>
            <p className="text-muted-foreground py-3 px-12">
              Vote on fund withdrawals and have a say in how donations are used.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Live Campaigns Preview */}
      <section className="flex flex-col items-center justify-center pt-16 pb-16 text-center">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">
            Active Campaigns
          </h2>
          <Link href="/campaigns">
            <Button variant="ghost">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {activeCampaigns.map((campaign) => {
            const raised = Number(campaign?.raised ?? 0);
            const goal = Number(campaign?.goal ?? 0);
            const progress = goal > 0 ? Math.min(100, Math.max(0, (raised / goal) * 100)) : 0;
            return (
              <div key={campaign.id} className="rounded-lg border bg-card p-4">
                <div className="aspect-video overflow-hidden rounded-md bg-muted">
                  {campaign.imageUrl ? (
                    <img
                      src={assetUrl(campaign.imageUrl)}
                      alt={campaign.title || "Campaign image"}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <h3 className="mt-4 font-semibold line-clamp-1">{campaign.title || "Untitled Campaign"}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{campaign.description || "No description available."}</p>
                <div className="mt-2 h-2 rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    ₹{Number.isFinite(raised) ? raised.toLocaleString() : "0"} raised
                  </span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {campaign.daysLeft ?? 0} days left
                </div>
                <div className="mt-4">
                  <Link href={`/campaign/${campaign.id}/${campaign.walletaddress || "unknown"}`}>
                    <Button variant="outline" className="w-full">View Campaign</Button>
                  </Link>
                </div>
              </div>
            );
          })}
          {activeCampaigns.length === 0 ? (
            <div className="rounded-lg border bg-card p-4 md:col-span-3 text-sm text-muted-foreground">
              No active campaigns to show yet.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}