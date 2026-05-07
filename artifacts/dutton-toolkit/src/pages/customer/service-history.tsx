import { ArrowLeft, FileText, Home, Calendar, DollarSign, User, Download } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ServiceHistoryPage() {
  const { jobRequests, warranties, jobPhotos, homeProfile } = useAppStore();

  const requests = (jobRequests ?? []).slice().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleExport = () => {
    const lines: string[] = [
      "DUTTON CONNECT — HOME SERVICE HISTORY REPORT",
      `Generated: ${format(new Date(), "MMMM d, yyyy")}`,
      homeProfile?.address ? `Property: ${homeProfile.address}` : "",
      "",
      "=".repeat(60),
      "",
    ];

    requests.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.title}`);
      lines.push(`   Category: ${r.category}`);
      lines.push(`   Date: ${format(new Date(r.createdAt), "MMMM d, yyyy")}`);
      lines.push(`   Address: ${r.address || "N/A"}`);
      if (r.budget) lines.push(`   Budget: $${r.budget}`);
      if (r.description) lines.push(`   Description: ${r.description}`);
      lines.push("");
    });

    const wArr = warranties ?? [];
    if (wArr.length > 0) {
      lines.push("=".repeat(60));
      lines.push("ACTIVE WARRANTIES");
      lines.push("");
      wArr.filter(w => new Date(w.expiresAt) > new Date()).forEach((w, i) => {
        lines.push(`${i + 1}. ${w.serviceDescription}`);
        lines.push(`   Pro: ${w.proName || "N/A"}`);
        lines.push(`   Completed: ${format(new Date(w.completedDate), "MMMM d, yyyy")}`);
        lines.push(`   Expires: ${format(new Date(w.expiresAt), "MMMM d, yyyy")}`);
        if (w.notes) lines.push(`   Notes: ${w.notes}`);
        lines.push("");
      });
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dutton-connect-service-history.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalSpent = requests.reduce((acc, r) => acc + (r.budget ?? 0), 0);
  const photoCount = (jobPhotos ?? []).length;
  const activeWarranties = (warranties ?? []).filter(w => new Date(w.expiresAt) > new Date()).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Service History</h1>
            <p className="text-sm text-muted-foreground">
              A full record of every job posted at your property.
            </p>
          </div>
        </div>
        {requests.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
        )}
      </div>

      {/* Stats row */}
      {requests.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Jobs", value: requests.length, icon: FileText },
            { label: "Total Budget", value: `$${totalSpent.toLocaleString()}`, icon: DollarSign },
            { label: "Photos", value: photoCount, icon: Home },
            { label: "Active Warranties", value: activeWarranties, icon: User },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold leading-tight">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {homeProfile && (
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 border px-4 py-2.5 text-sm text-gray-700">
          <Home className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium">{homeProfile.address}</span>
          <span className="text-gray-400">·</span>
          <span className="text-muted-foreground capitalize">{homeProfile.homeType}</span>
          {homeProfile.yearBuilt && <><span className="text-gray-400">·</span><span className="text-muted-foreground">Built {homeProfile.yearBuilt}</span></>}
        </div>
      )}

      {requests.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 py-14 text-center text-muted-foreground">
          <FileText className="h-9 w-9 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No service history yet</p>
          <p className="text-xs mt-1 max-w-xs mx-auto">
            Every job request you post will appear here, building a permanent record you can export when selling your home.
          </p>
          <Link href="/post-request">
            <Button size="sm" className="mt-4">Post Your First Request</Button>
          </Link>
        </div>
      )}

      {requests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">All Jobs</h2>
          {requests.map((r, i) => {
            const relatedPhotos = (jobPhotos ?? []).filter(p => p.jobRequestId === r.id);
            const relatedWarranty = (warranties ?? []).find(w => w.jobRequestId === r.id);
            return (
              <Card key={r.id}>
                <CardContent className="p-4 flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                    {requests.length - i}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">{r.title}</span>
                      <Badge variant="secondary" className="text-xs">{r.category}</Badge>
                      {r.status === "closed" && <Badge variant="outline" className="text-xs">Completed</Badge>}
                      {relatedWarranty && new Date(relatedWarranty.expiresAt) > new Date() && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs">Warranty Active</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(r.createdAt), "MMM d, yyyy")}</span>
                      {r.address && <span className="flex items-center gap-1"><Home className="h-3 w-3" />{r.address}</span>}
                      {r.budget > 0 && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${r.budget}</span>}
                    </div>
                    {r.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.description}</p>}
                    {relatedPhotos.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {relatedPhotos.slice(0, 3).map(p => (
                          p.afterDataUrl && <img key={p.id} src={p.afterDataUrl} className="h-12 w-12 rounded object-cover border" />
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
