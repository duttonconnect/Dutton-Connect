import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  MapPin,
  Calendar,
  AlertCircle,
  Send,
  Filter,
  Inbox,
} from "lucide-react";

import {
  useAppStore,
  type JobRequest,
  type RequestCategory,
  type Urgency,
} from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FeedRequest = JobRequest & { distanceMiles: number; isSample?: boolean };

const SAMPLE_FEED: FeedRequest[] = [
  {
    id: "sr-1",
    title: "Replace porch light fixture",
    category: "Handyman",
    description:
      "Old fixture stopped working. Need a similar style replaced. I'll provide the new fixture from Lowe's.",
    address: "311 Hill St, Athens, GA",
    budget: 120,
    preferredDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    urgency: "Normal",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    distanceMiles: 2.4,
    isSample: true,
  },
  {
    id: "sr-2",
    title: "Kitchen sink leaking under cabinet",
    category: "Plumbing",
    description:
      "Slow drip from the P-trap. Cabinet floor getting damp. Need this fixed before it gets worse.",
    address: "1024 Prince Ave, Athens, GA",
    budget: 200,
    preferredDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    urgency: "Urgent",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    distanceMiles: 4.1,
    isSample: true,
  },
  {
    id: "sr-3",
    title: "Pressure wash driveway and walkway",
    category: "Pressure Washing",
    description:
      "Two-car driveway plus the walkway up to the front porch. Lots of mildew on the north side.",
    address: "55 Gaines School Rd, Athens, GA",
    budget: 275,
    preferredDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    urgency: "Low",
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    distanceMiles: 7.8,
    isSample: true,
  },
  {
    id: "sr-4",
    title: "Install new dishwasher",
    category: "Appliance Installation",
    description:
      "New Bosch dishwasher arriving Tuesday. Need the old one removed and the new one installed and tested.",
    address: "412 Riverbend Pkwy, Watkinsville, GA",
    budget: 180,
    preferredDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    urgency: "Normal",
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    distanceMiles: 12.6,
    isSample: true,
  },
  {
    id: "sr-5",
    title: "Spring yard cleanup, half acre",
    category: "Yard Work",
    description:
      "Leaf cleanup, hedge trim along the front, mulch refresh on three beds. Materials provided.",
    address: "88 Hampton Park Dr, Bogart, GA",
    budget: 425,
    preferredDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    urgency: "Low",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    distanceMiles: 18.3,
    isSample: true,
  },
  {
    id: "sr-6",
    title: "Replace alternator on '12 F-150",
    category: "Automotive",
    description:
      "Battery light came on yesterday and dies if it sits overnight. Have the part already.",
    address: "147 Mars Hill Rd, Watkinsville, GA",
    budget: 320,
    preferredDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    urgency: "Urgent",
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    distanceMiles: 32.1,
    isSample: true,
  },
];

// Stable mock distance for user-posted requests, derived from the request id.
function mockDistanceFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h % 480) / 10 + 0.5; // 0.5 - 48.5 mi
}

const urgencyStyle: Record<Urgency, string> = {
  Low: "bg-gray-100 text-gray-700",
  Normal: "bg-blue-100 text-blue-800",
  Urgent: "bg-red-100 text-red-800",
};

const ALL_CATEGORIES: (RequestCategory | "All")[] = [
  "All",
  "Handyman",
  "Plumbing",
  "Automotive",
  "Pressure Washing",
  "Yard Work",
  "Appliance Installation",
  "Other",
];

const DISTANCE_OPTIONS = [10, 25, 50] as const;

export default function NearbyJobs() {
  const { jobRequests } = useAppStore();
  const [maxDistance, setMaxDistance] = useState<number>(25);
  const [categoryFilter, setCategoryFilter] = useState<RequestCategory | "All">(
    "All",
  );

  const customerRequests: FeedRequest[] = useMemo(
    () =>
      (jobRequests ?? []).map((r) => ({
        ...r,
        distanceMiles: mockDistanceFor(r.id),
      })),
    [jobRequests],
  );

  const allRequests: FeedRequest[] = useMemo(
    () =>
      [...customerRequests, ...SAMPLE_FEED].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [customerRequests],
  );

  const visible = useMemo(
    () =>
      allRequests.filter(
        (r) =>
          r.distanceMiles <= maxDistance &&
          (categoryFilter === "All" || r.category === categoryFilter),
      ),
    [allRequests, maxDistance, categoryFilter],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nearby Jobs</h1>
          <p className="text-gray-500">
            Customer requests in your service area. Send a quote to get the work.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Distance
              </label>
              <Select
                value={String(maxDistance)}
                onValueChange={(v) => setMaxDistance(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISTANCE_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      Within {d} miles
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Category
              </label>
              <Select
                value={categoryFilter}
                onValueChange={(v) =>
                  setCategoryFilter(v as RequestCategory | "All")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-bold text-gray-900">{visible.length}</span>{" "}
                of {allRequests.length} requests
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <div className="text-sm">No matching requests in this area.</div>
            <div className="text-xs mt-1">
              Try widening the distance or changing the category.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <CardContent className="p-5 flex flex-col gap-3 flex-1">
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
                      {!r.isSample && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-emerald-100 text-emerald-800"
                        >
                          Posted by you
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">Budget</div>
                    <div className="font-bold text-lg">${r.budget.toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">
                      ~{r.distanceMiles.toFixed(1)} mi
                    </div>
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
                    {format(new Date(r.preferredDate), "MMM d")}
                  </span>
                </div>

                <div className="mt-auto pt-3 border-t">
                  <Button
                    className="w-full"
                    onClick={() =>
                      toast.success(`Quote sent for "${r.title}"`)
                    }
                  >
                    <Send className="mr-2 h-4 w-4" /> Send Quote
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
