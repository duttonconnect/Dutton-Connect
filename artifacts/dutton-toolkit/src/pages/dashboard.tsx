import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Link } from "wouter";
import { Hammer, Users, FileText, Plus, ArrowRight, Map as MapIcon, Car, Receipt, Inbox, Zap } from "lucide-react";
import { OnboardingBanner } from "@/components/onboarding-banner";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { jobs, quotes, payments, customers } = useAppStore();

  const activeJobs = jobs.filter(j => j.status === "in_progress" || j.status === "scheduled");
  const jobsScheduledToday = activeJobs.filter(j => new Date(j.scheduledDate).toDateString() === new Date().toDateString());
  
  const outstandingPaymentsTotal = payments.reduce((acc, p) => acc + p.amount, 0); // simplification for now

  return (
    <div className="space-y-6">
      <OnboardingBanner />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Local jobs. Trusted pros.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/jobs/new">
            <Button><Plus className="mr-2 h-4 w-4" /> New Job</Button>
          </Link>
          <Link href="/quotes/new">
            <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> New Quote</Button>
          </Link>
          <Link href="/nearby-jobs">
            <Button variant="outline"><Inbox className="mr-2 h-4 w-4" /> Nearby Requests</Button>
          </Link>
          <Link href="/map">
            <Button variant="outline"><MapIcon className="mr-2 h-4 w-4" /> View Job Map</Button>
          </Link>
          <Link href="/mileage">
            <Button variant="outline"><Car className="mr-2 h-4 w-4" /> Mileage Tracker</Button>
          </Link>
          <Link href="/receipts">
            <Button variant="outline"><Receipt className="mr-2 h-4 w-4" /> Receipts</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Hammer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobs.length}</div>
            <p className="text-xs text-muted-foreground">
              {jobsScheduledToday.length} scheduled for today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recorded Payments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${outstandingPaymentsTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across {payments.length} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Jobs</CardTitle>
            <Link href="/jobs">
              <Button variant="ghost" size="sm">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobs.slice(0, 5).map(job => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground">
                  <div className="flex flex-col gap-1">
                    <Link href={`/jobs/${job.id}`}>
                      <span className="font-semibold hover:underline cursor-pointer">{job.title}</span>
                    </Link>
                    <span className="text-xs text-muted-foreground">{format(new Date(job.scheduledDate), "MMM d, yyyy")}</span>
                  </div>
                  <div className="text-sm font-medium px-2 py-1 bg-primary/10 text-primary rounded-md">
                    {job.status.replace("_", " ").toUpperCase()}
                  </div>
                </div>
              ))}
              {jobs.length === 0 && <div className="text-sm text-gray-500">No jobs yet.</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Quotes</CardTitle>
            <Link href="/quotes">
              <Button variant="ghost" size="sm">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quotes.slice(0, 5).map(quote => {
                const customer = customers.find(c => c.id === quote.customerId);
                return (
                  <div key={quote.id} className="flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground">
                    <div className="flex flex-col gap-1">
                      <Link href={`/quotes/${quote.id}`}>
                        <span className="font-semibold hover:underline cursor-pointer">Quote for {customer?.name || "Unknown"}</span>
                      </Link>
                      <span className="text-xs text-muted-foreground">{format(new Date(quote.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    <div className="text-sm font-medium px-2 py-1 bg-secondary text-secondary-foreground rounded-md">
                      {quote.status.toUpperCase()}
                    </div>
                  </div>
                );
              })}
              {quotes.length === 0 && <div className="text-sm text-gray-500">No quotes yet.</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pro Features Coming Soon */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-500 tracking-wide">
            Pro Features Coming Soon
          </span>
        </div>
        <ul className="space-y-1.5 pl-6">
          {[
            "Priority job placement",
            "Unlimited quotes",
            "Advanced business tools — mileage & receipts reports",
          ].map((item) => (
            <li key={item} className="text-sm text-gray-400 list-disc">
              {item}
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-400 mt-3">
          All features are free during the current preview period.
        </p>
      </div>
    </div>
  );
}
