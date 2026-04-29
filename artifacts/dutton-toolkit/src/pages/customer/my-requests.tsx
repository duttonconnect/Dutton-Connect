import { Link } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  ClipboardList,
  Plus,
  MapPin,
  Calendar,
  Trash2,
  AlertCircle,
} from "lucide-react";

import { useAppStore, type Urgency } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const urgencyStyle: Record<Urgency, string> = {
  Low: "bg-gray-100 text-gray-700",
  Normal: "bg-blue-100 text-blue-800",
  Urgent: "bg-red-100 text-red-800",
};

export default function MyJobRequests() {
  const { jobRequests, deleteJobRequest } = useAppStore();
  const list = jobRequests ?? [];

  const sorted = [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              My Job Requests
            </h1>
            <p className="text-gray-500 text-sm">
              {list.length} request{list.length === 1 ? "" : "s"} posted
            </p>
          </div>
        </div>
        <Link href="/post-request">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New
          </Button>
        </Link>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <div className="text-sm">No requests yet.</div>
            <div className="text-xs mt-1">
              Post a job and let local pros come to you.
            </div>
            <Link href="/post-request">
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> Post Your First Job
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((r) => (
            <Card key={r.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {r.photoDataUrl && (
                  <div className="sm:w-40 sm:shrink-0 bg-gray-50 aspect-[4/3] sm:aspect-auto">
                    <img
                      src={r.photoDataUrl}
                      alt={r.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-5 flex-1 flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-lg truncate" title={r.title}>
                        {r.title}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {r.category}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${urgencyStyle[r.urgency]}`}
                        >
                          {r.urgency === "Urgent" && (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {r.urgency}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted-foreground">Budget</div>
                      <div className="font-bold">${r.budget.toFixed(0)}</div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                    {r.description}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2 border-t">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {r.address}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Wanted by{" "}
                      {format(new Date(r.preferredDate), "MMM d, yyyy")}
                    </span>
                    <span className="ml-auto">
                      Posted {format(new Date(r.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>

                  <div className="flex justify-end pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Delete request "${r.title}"?`)) {
                          deleteJobRequest(r.id);
                          toast.success("Request deleted");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
