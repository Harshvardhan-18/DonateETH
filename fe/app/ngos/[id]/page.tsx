"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { apiUrl, assetUrl } from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";

type Ngo = {
  id: string;
  name: string;
  registrationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  walletAddress?: string | null;
  status: string;
  campaigns?: any[];
};

export default function NgoDetailPage() {
  const params = useParams<{ id: string }>();
  const [ngo, setNgo] = useState<Ngo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(apiUrl(`/ngos/${params.id}`), { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load NGO");
        const data = await res.json();
        setNgo(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load NGO");
      }
    };
    if (params?.id) load();
  }, [params?.id]);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 max-w-6xl mx-auto px-6">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!ngo ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

        {ngo ? (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <Card className="p-6">
                <h1 className="text-3xl font-bold">{ngo.name}</h1>
                <div className="mt-2 grid md:grid-cols-2 gap-2 text-sm">
                  <p><b>Registration</b>: {ngo.registrationNumber || "-"}</p>
                  <p><b>Status</b>: {ngo.status}</p>
                  <p><b>Email</b>: {ngo.email || "-"}</p>
                  <p><b>Phone</b>: {ngo.phone || "-"}</p>
                  <p className="md:col-span-2"><b>Wallet</b>: {ngo.walletAddress || "-"}</p>
                </div>
              </Card>
            </motion.div>

            <div className="space-y-3">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5 }}
                className="text-xl font-semibold"
              >
                Ongoing / Open Campaigns
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="grid gap-4 md:grid-cols-2"
              >
                {(ngo.campaigns || []).map((c: any, idx: number) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.45, delay: idx * 0.02 }}
                  >
                    <Card className="p-4">
                      <div className="flex gap-3">
                        {c.imageUrl ? (
                          <img
                            src={assetUrl(c.imageUrl)}
                            alt={c.title || "Campaign"}
                            className="w-24 h-24 object-cover rounded"
                          />
                        ) : null}
                        <div className="flex-1">
                          <p className="font-semibold">{c.title || "Untitled"}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{c.description || ""}</p>
                          <div className="mt-2">
                            <Link className="text-sm underline" href={`/campaign/${c.id}/${c.walletaddress || "unknown"}`}>
                              View campaign
                            </Link>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
                {(ngo.campaigns || []).length === 0 ? (
                  <Card className="p-4 text-sm text-muted-foreground md:col-span-2">No campaigns yet.</Card>
                ) : null}
              </motion.div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

