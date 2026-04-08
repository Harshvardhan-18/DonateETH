"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiUrl } from "@/lib/api";
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

export default function NgoDirectoryPage() {
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    registrationNumber: "",
    email: "",
    phone: "",
    walletAddress: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Ngo | null>(null);

  const fetchNgos = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/ngos"), { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch NGOs");
      const data = await res.json();
      setNgos(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load NGOs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNgos();
  }, []);

  const onCreateNgo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setCreated(null);
    setError("");
    try {
      const res = await fetch(apiUrl("/ngos"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create NGO");
      const ngo = await res.json();
      setCreated(ngo);
      setForm({ name: "", registrationNumber: "", email: "", phone: "", walletAddress: "" });
      await fetchNgos();
    } catch (e: any) {
      setError(e?.message || "NGO creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const approvedNgos = useMemo(() => ngos.filter((n) => ["APPROVED", "ACTIVE"].includes(n.status)), [ngos]);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 max-w-6xl mx-auto px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-3xl font-bold"
            >
              NGOs
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.15 }}
              className="text-sm text-muted-foreground"
            >
              Browse registered NGOs and their campaigns. NGOs can register below for admin review.
            </motion.p>
          </div>
        </div>

        <Tabs defaultValue="list" className="mt-6">
          <TabsList>
            <TabsTrigger value="list">NGO Directory</TabsTrigger>
            <TabsTrigger value="register">Register NGO</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="grid gap-4 md:grid-cols-2 mt-4"
            >
              {approvedNgos.map((ngo, idx) => (
                <motion.div
                  key={ngo.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: idx * 0.02 }}
                >
                  <Link href={`/ngos/${ngo.id}`}>
                    <Card className="p-4 hover:bg-muted/50 transition">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{ngo.name}</p>
                          <p className="text-sm text-muted-foreground">Reg: {ngo.registrationNumber || "-"}</p>
                          <p className="text-sm">Campaigns: {ngo.campaigns?.length ?? 0}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-700">{ngo.status}</span>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
              {approvedNgos.length === 0 && !loading ? (
                <Card className="p-4 text-sm text-muted-foreground md:col-span-2">No approved NGOs yet.</Card>
              ) : null}
            </motion.div>
          </TabsContent>

          <TabsContent value="register" className="mt-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <Card className="p-6 max-w-xl">
                <h2 className="text-xl font-semibold">Register your NGO</h2>
                <p className="text-sm text-muted-foreground mt-1">Your NGO will appear publicly after admin approval.</p>

                <form className="space-y-4 mt-4" onSubmit={onCreateNgo}>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Registration Number</Label>
                    <Input
                      value={form.registrationNumber}
                      onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email (optional)</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone (optional)</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Wallet Address</Label>
                    <Input
                      value={form.walletAddress}
                      onChange={(e) => setForm({ ...form, walletAddress: e.target.value })}
                      required
                      placeholder="0x..."
                    />
                  </div>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit for Review"}
                  </Button>
                </form>

                {created ? (
                  <p className="text-sm text-green-700 mt-4">
                    Submitted. NGO status: <b>{created.status}</b>. Please wait for admin approval.
                  </p>
                ) : null}
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

