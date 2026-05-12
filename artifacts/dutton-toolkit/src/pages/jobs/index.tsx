import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, Search, Navigation, Hammer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function JobsList() {
  const { jobs, customers } = useAppStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase()) || 
                          job.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-gray-500">Manage your scheduled and completed work.</p>
        </div>
        <Link href="/jobs/new">
          <Button><Plus className="mr-2 h-4 w-4" /> New Job</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search jobs by title or address..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredJobs.length === 0 ? (
              jobs.length === 0 ? (
                <div className="text-center py-14 text-muted-foreground">
                  <Hammer className="h-10 w-10 mx-auto mb-3 opacity-25" />
                  <p className="font-medium text-gray-700">No jobs yet</p>
                  <p className="text-sm mt-1">Post your first job to get started.</p>
                  <Link href="/jobs/new">
                    <Button className="mt-4" size="sm">
                      <Plus className="mr-2 h-4 w-4" /> New Job
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-14 text-muted-foreground">
                  <Search className="h-10 w-10 mx-auto mb-3 opacity-25" />
                  <p className="font-medium text-gray-700">No matching jobs</p>
                  <p className="text-sm mt-1">Try adjusting your search or status filter.</p>
                </div>
              )
            ) : (
              filteredJobs.map(job => {

                const customer = customers.find(c => c.id === job.customerId);
                const directionsHref =
                  typeof job.latitude === "number" && typeof job.longitude === "number"
                    ? `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`
                    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`;
                return (
                  <div
                    key={job.id}
                    className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <Link href={`/jobs/${job.id}`} className="flex-1 cursor-pointer">
                      <div className="space-y-1">
                        <div className="font-semibold text-lg">{job.title}</div>
                        <div className="text-sm text-muted-foreground">{customer?.name} • {job.address}</div>
                      </div>
                    </Link>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 sm:min-w-[160px]">
                      <div className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {job.status.replace("_", " ").toUpperCase()}
                      </div>
                      <div className="text-sm font-medium">
                        {format(new Date(job.scheduledDate), "MMM d, yyyy")}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a href={directionsHref} target="_blank" rel="noopener noreferrer">
                          <Navigation className="mr-2 h-3.5 w-3.5" /> Directions
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
