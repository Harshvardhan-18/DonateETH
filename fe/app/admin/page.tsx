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
      loadData(jwt).catch(() => undefined);
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

  const approvedNgos = useMemo(
    () => ngos.filter((ngo) => ["APPROVED", "ACTIVE"].includes(String(ngo?.status))),
    [ngos]
  );
  const pendingNgos = useMemo(
    () => ngos.filter((ngo) => String(ngo?.status) === "PENDING"),
    [ngos]
  );
  const otherNgos = useMemo(
    () => ngos.filter((ngo) => !["APPROVED", "ACTIVE", "PENDING"].includes(String(ngo?.status))),
    [ngos]
  );
  const approvedDocuments = useMemo(
    () => documents.filter((doc) => String(doc?.status) === "APPROVED"),
    [documents]
  );
  const pendingDocuments = useMemo(
    () => documents.filter((doc) => String(doc?.status) === "PENDING"),
    [documents]
  );
  const rejectedDocuments = useMemo(
    () => documents.filter((doc) => String(doc?.status) === "REJECTED"),
    [documents]
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
                    Donor: {tx.donorName || tx.donorWallet} {"->"} NGO: {tx.ngoWallet} | {tx.amountEth} ETH {tx.isSample ? "(sample)" : ""} | <a href={tx.etherscanUrl} target="_blank" rel="noreferrer" className="underline">Tx</a>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ngos">
            <div className="space-y-6">
              <section className="space-y-3">
                <h3 className="text-lg font-semibold">Approved</h3>
                {approvedNgos.map((ngo) => (
                  <Card key={ngo.id} className="p-4 flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{ngo.name}</p>
                      <p className="text-sm text-muted-foreground">{ngo.user?.email}</p>
                      <p className="text-sm">Campaigns: {ngo.campaigns?.length ?? 0}</p>
                      <p className="text-sm">Status: {ngo.status}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => adminPatch(`/ngos/${ngo.id}/status`, token, { status: "SUSPENDED" }).then(() => loadData(token))}>Suspend</Button>
                      <Button size="sm" variant="destructive" onClick={() => adminPatch(`/ngos/${ngo.id}/status`, token, { status: "REJECTED" }).then(() => loadData(token))}>Reject</Button>
                    </div>
                  </Card>
                ))}
                {approvedNgos.length === 0 ? (
                  <Card className="p-4 text-sm text-muted-foreground">No approved NGOs.</Card>
                ) : null}
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-semibold">Pending Approval</h3>
                {pendingNgos.map((ngo) => (
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
                {pendingNgos.length === 0 ? (
                  <Card className="p-4 text-sm text-muted-foreground">No pending NGOs.</Card>
                ) : null}
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-semibold">Suspended / Rejected</h3>
                {otherNgos.map((ngo) => (
                  <Card key={ngo.id} className="p-4 flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{ngo.name}</p>
                      <p className="text-sm text-muted-foreground">{ngo.user?.email}</p>
                      <p className="text-sm">Campaigns: {ngo.campaigns?.length ?? 0}</p>
                      <p className="text-sm">Status: {ngo.status}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => adminPatch(`/ngos/${ngo.id}/status`, token, { status: "APPROVED" }).then(() => loadData(token))}>Approve</Button>
                    </div>
                  </Card>
                ))}
                {otherNgos.length === 0 ? (
                  <Card className="p-4 text-sm text-muted-foreground">No suspended/rejected NGOs.</Card>
                ) : null}
              </section>
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="p-4">
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="text-sm border-b pb-2">
                    Donor: {tx.donorName || tx.donorWallet} | NGO: {tx.ngoWallet} | Amount: {tx.amountEth} ETH {tx.isSample ? "(sample)" : ""} |{" "}
                    <a href={tx.etherscanUrl} target="_blank" rel="noreferrer" className="underline">Hash</a>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-6">
              <section className="space-y-3">
                <h3 className="text-lg font-semibold">Pending Verification</h3>
                {pendingDocuments.map((doc) => (
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
                {pendingDocuments.length === 0 ? (
                  <Card className="p-4 text-sm text-muted-foreground">No pending documents.</Card>
                ) : null}
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-semibold">Approved</h3>
                {approvedDocuments.map((doc) => (
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
                {approvedDocuments.length === 0 ? (
                  <Card className="p-4 text-sm text-muted-foreground">No approved documents.</Card>
                ) : null}
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-semibold">Rejected</h3>
                {rejectedDocuments.map((doc) => (
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
                    </div>
                  </Card>
                ))}
                {rejectedDocuments.length === 0 ? (
                  <Card className="p-4 text-sm text-muted-foreground">No rejected documents.</Card>
                ) : null}
              </section>

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
                  <p key={ngo.ngoWallet} className="text-sm">{ngo.ngoWallet}: {Number(ngo.totalEth || ngo?._sum?.amountEth || 0).toFixed(4)} ETH</p>
                ))}
              </Card>
              <Card className="p-4">
                <h4 className="font-medium mb-2">Most Active Donors</h4>
                {analytics?.activeDonors?.map((donor: any) => (
                  <p key={donor.donorWallet} className="text-sm">
                    {(donor.donorName || donor.donorWallet)}: {donor.donationCount || donor?._count?.donorWallet || 0} donations
                    {donor.totalEth ? ` (${Number(donor.totalEth).toFixed(4)} ETH)` : ""}
                  </p>
                ))}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}