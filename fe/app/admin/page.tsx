"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminGet, adminPatch, adminPost } from "@/lib/admin-api";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [token, setToken] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [ngos, setNgos] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  const loadData = async (jwt: string) => {
    const [o, n, t, d, a] = await Promise.allSettled([
      adminGet("/dashboard/overview", jwt),
      adminGet("/ngos", jwt),
      adminGet("/transactions", jwt),
      adminGet("/documents", jwt),
      adminGet("/analytics", jwt),
    ]);
    setOverview(o.status === "fulfilled" ? o.value : null);
    setNgos(n.status === "fulfilled" ? n.value : []);
    setTransactions(t.status === "fulfilled" ? t.value : []);
    setDocuments(d.status === "fulfilled" ? d.value : []);
    setAnalytics(a.status === "fulfilled" ? a.value : null);

    const failedCount = [o, n, t, d, a].filter((result) => result.status === "rejected").length;
    setErrorMessage(
      failedCount > 0
        ? `${failedCount} admin section(s) failed to load. You can still use available tabs.`
        : ""
    );
  };

  useEffect(() => {
    const jwt = localStorage.getItem("admin_token");
    if (!jwt) {
      router.push("/admin/login");
      return;
    }
    setToken(jwt);
    loadData(jwt).catch(() => {
      setErrorMessage("Admin data failed to load. Tabs work, but data actions may fail until backend recovers.");
    });
    const poll = setInterval(() => {
      adminGet("/transactions", jwt).then(setTransactions).catch(() => undefined);
    }, 15000);
    return () => clearInterval(poll);
  }, [router]);

  const trendData = useMemo(
    () => ({
      labels: analytics?.donationTrend?.map((d: any) => d.date) ?? [],
      datasets: [
        {
          label: "Donations (ETH)",
          data: analytics?.donationTrend?.map((d: any) => Number(d.amount)) ?? [],
          borderColor: "#22c55e",
          backgroundColor: "rgba(34, 197, 94, 0.15)",
        },
      ],
    }),
    [analytics]
  );

  const logout = () => {
    localStorage.removeItem("admin_token");
    document.cookie = "admin_token=; path=/; max-age=0";
    router.push("/admin/login");
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => adminPost("/transactions/sync", token).then(() => loadData(token))}>
              Sync Blockchain
            </Button>
            <Button variant="destructive" onClick={logout}>Logout</Button>
          </div>
        </div>

        {errorMessage ? (
          <Card className="p-3 border-red-300 text-red-600 text-sm">{errorMessage}</Card>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="ngos">NGO Management</TabsTrigger>
            <TabsTrigger value="transactions">Donation Tracking</TabsTrigger>
            <TabsTrigger value="documents">Document Verification</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4"><p className="text-sm text-muted-foreground">Total ETH</p><p className="text-2xl font-bold">{overview?.metrics?.totalDonationsEth ?? 0}</p></Card>
              <Card className="p-4"><p className="text-sm text-muted-foreground">Total INR</p><p className="text-2xl font-bold">{Math.round(overview?.metrics?.totalDonationsInr ?? 0)}</p></Card>
              <Card className="p-4"><p className="text-sm text-muted-foreground">NGOs Registered</p><p className="text-2xl font-bold">{overview?.metrics?.totalNgos ?? 0}</p></Card>
              <Card className="p-4"><p className="text-sm text-muted-foreground">Campaigns Active</p><p className="text-2xl font-bold">{overview?.metrics?.totalCampaignsActive ?? 0}</p></Card>
            </div>
            <Card className="p-4 mt-4">
              <h3 className="font-semibold mb-3">Recent Transactions</h3>
              <div className="space-y-2">
                {overview?.recentTransactions?.map((tx: any) => (
                  <div key={tx.id} className="text-sm border-b pb-2">
                    {tx.donorWallet} {"->"} {tx.ngoWallet} | {tx.amountEth} ETH | <a href={tx.etherscanUrl} target="_blank" rel="noreferrer" className="underline">Tx</a>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ngos">
            <div className="space-y-3">
              {ngos.map((ngo) => (
                <Card key={ngo.id} className="p-4 flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{ngo.name}</p>
                    <p className="text-sm text-muted-foreground">{ngo.user?.email}</p>
                    <p className="text-sm">Campaigns: {ngo.campaigns?.length ?? 0}</p>
                    <p className="text-sm">Status: {ngo.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => adminPatch(`/ngos/${ngo.id}/status`, token, { status: "APPROVED" }).then(() => loadData(token))}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => adminPatch(`/ngos/${ngo.id}/status`, token, { status: "SUSPENDED" }).then(() => loadData(token))}>Suspend</Button>
                    <Button size="sm" variant="destructive" onClick={() => adminPatch(`/ngos/${ngo.id}/status`, token, { status: "REJECTED" }).then(() => loadData(token))}>Reject</Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="p-4">
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="text-sm border-b pb-2">
                    Donor: {tx.donorWallet} | NGO: {tx.ngoWallet} | Amount: {tx.amountEth} ETH |{" "}
                    <a href={tx.etherscanUrl} target="_blank" rel="noreferrer" className="underline">Hash</a>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-3">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">Campaign: {doc.campaign?.title ?? doc.campaignId}</p>
                    <p className="text-sm">Type: {doc.type}</p>
                    <p className="text-sm">Status: {doc.status}</p>
                    <a className="text-sm underline" href={doc.previewUrl} target="_blank" rel="noreferrer">Open document</a>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        adminPatch("/documents/verify", token, {
                          campaignId: doc.campaignId,
                          docType: doc.type,
                          documentUrl: doc.sourceUrl,
                          status: "APPROVED",
                        }).then(() => loadData(token))
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        adminPatch("/documents/verify", token, {
                          campaignId: doc.campaignId,
                          docType: doc.type,
                          documentUrl: doc.sourceUrl,
                          status: "REJECTED",
                        }).then(() => loadData(token))
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </Card>
              ))}
              {documents.length === 0 ? (
                <Card className="p-4 text-sm text-muted-foreground">
                  No campaign documents found yet. Upload certificate/supporting docs while creating campaigns.
                </Card>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Donation Trend (Chart.js)</h3>
              <Line data={trendData} />
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card className="p-4">
                <h4 className="font-medium mb-2">Top NGOs by Funds</h4>
                {analytics?.topNgos?.map((ngo: any) => (
                  <p key={ngo.ngoWallet} className="text-sm">{ngo.ngoWallet}: {Number(ngo._sum.amountEth || 0).toFixed(4)} ETH</p>
                ))}
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Most Active Donors</h4>
                {analytics?.activeDonors?.map((donor: any) => (
                  <p key={donor.donorWallet} className="text-sm">{donor.donorWallet}: {donor._count.donorWallet} donations</p>
                ))}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}