import { useAppStore } from "@/lib/store";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MapPin, Phone, Mail, Clock, DollarSign, Calendar, ArrowLeft, Plus, CheckCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function JobDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { jobs, customers, updateJob, deleteJob } = useAppStore();
  
  const job = jobs.find(j => j.id === id);
  const customer = job ? customers.find(c => c.id === job.customerId) : null;

  const [timeHours, setTimeHours] = useState("");
  const [timeDesc, setTimeDesc] = useState("");
  
  const [matDesc, setMatDesc] = useState("");
  const [matCost, setMatCost] = useState("");

  if (!job || !customer) {
    return <div className="p-8 text-center text-muted-foreground">Job not found</div>;
  }

  const totalTimeHours = job.timeEntries.reduce((acc, t) => acc + t.hours, 0);
  const totalLaborCost = totalTimeHours * job.hourlyRate;
  const actualMaterialsCost = job.materials.reduce((acc, m) => acc + m.cost, 0) || job.materialsCost;
  const totalCost = totalLaborCost + actualMaterialsCost;

  const handleStatusChange = (status: "scheduled" | "in_progress" | "completed" | "cancelled") => {
    updateJob(job.id, { status });
    toast.success(`Job marked as ${status.replace("_", " ")}`);
  };

  const handleAddTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeHours) return;
    
    const entry = {
      id: Math.random().toString(36).substring(7),
      date: new Date().toISOString(),
      hours: parseFloat(timeHours),
      description: timeDesc || "Labor"
    };

    updateJob(job.id, {
      timeEntries: [...job.timeEntries, entry]
    });
    setTimeHours("");
    setTimeDesc("");
    toast.success("Time entry added");
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matDesc || !matCost) return;
    
    const entry = {
      id: Math.random().toString(36).substring(7),
      description: matDesc,
      cost: parseFloat(matCost)
    };

    updateJob(job.id, {
      materials: [...job.materials, entry],
      materialsCost: job.materialsCost + entry.cost
    });
    setMatDesc("");
    setMatCost("");
    toast.success("Material added");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/jobs">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{job.title}</h1>
            <Badge variant={job.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
              {job.status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>
        </div>
        <div className="hidden sm:flex gap-2">
          {job.status !== "completed" && (
            <Button onClick={() => handleStatusChange("completed")} className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle className="mr-2 h-4 w-4" /> Mark Complete
            </Button>
          )}
          {job.status === "scheduled" && (
            <Button variant="outline" onClick={() => handleStatusChange("in_progress")}>
              Start Job
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Address</div>
                  <div className="text-muted-foreground">{job.address}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Scheduled For</div>
                  <div className="text-muted-foreground">{format(new Date(job.scheduledDate), "EEEE, MMMM do, yyyy")}</div>
                </div>
              </div>
              {job.description && (
                <div className="pt-4 border-t">
                  <div className="font-medium mb-1">Scope of Work</div>
                  <div className="text-muted-foreground whitespace-pre-wrap text-sm">{job.description}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-lg">Time Log</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Time</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddTime} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Hours</label>
                        <Input type="number" step="0.25" value={timeHours} onChange={e => setTimeHours(e.target.value)} required />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Input value={timeDesc} onChange={e => setTimeDesc(e.target.value)} placeholder="e.g. Labor" />
                      </div>
                      <Button type="submit" className="w-full">Save Time</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {job.timeEntries.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">No time logged yet</div>
                  ) : (
                    job.timeEntries.map(t => (
                      <div key={t.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                        <div>
                          <div className="font-medium">{t.hours} hrs</div>
                          <div className="text-xs text-muted-foreground">{t.description}</div>
                        </div>
                        <div className="text-muted-foreground text-xs">{format(new Date(t.date), "MMM d")}</div>
                      </div>
                    ))
                  )}
                  <div className="pt-2 flex justify-between font-bold border-t">
                    <span>Total Hours:</span>
                    <span>{totalTimeHours}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-lg">Materials</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddMaterial} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Input value={matDesc} onChange={e => setMatDesc(e.target.value)} required />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Cost ($)</label>
                        <Input type="number" step="0.01" value={matCost} onChange={e => setMatCost(e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full">Save Material</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {job.materials.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      {job.materialsCost > 0 ? `Est. Cost: $${job.materialsCost.toFixed(2)}` : "No materials recorded"}
                    </div>
                  ) : (
                    job.materials.map(m => (
                      <div key={m.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                        <div className="text-muted-foreground">{m.description}</div>
                        <div className="font-medium">${m.cost.toFixed(2)}</div>
                      </div>
                    ))
                  )}
                  <div className="pt-2 flex justify-between font-bold border-t">
                    <span>Total Materials:</span>
                    <span>${actualMaterialsCost.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Customer & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="font-semibold text-lg">{customer.name}</div>
              <div className="space-y-2 text-sm">
                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                  <Phone className="h-4 w-4" /> {customer.phone}
                </a>
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-primary hover:underline">
                    <Mail className="h-4 w-4" /> {customer.email}
                  </a>
                )}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href={`/customers`}>View Customer Profile</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle>Financials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Labor ({totalTimeHours}h @ ${job.hourlyRate}/hr)</span>
                <span>${totalLaborCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Materials</span>
                <span>${actualMaterialsCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2 border-primary/20">
                <span>Total</span>
                <span>${totalCost.toFixed(2)}</span>
              </div>
              
              <div className="pt-4 space-y-2">
                <Button className="w-full" asChild>
                  <Link href={`/quotes/new?jobId=${job.id}`}>Generate Quote</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/payments?jobId=${job.id}`}>Record Payment</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex sm:hidden gap-2">
            {job.status !== "completed" && (
              <Button onClick={() => handleStatusChange("completed")} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="mr-2 h-4 w-4" /> Complete
              </Button>
            )}
          </div>
          
          <div className="pt-8">
            <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if(confirm("Are you sure you want to delete this job?")) {
                  deleteJob(job.id);
                  setLocation("/jobs");
                  toast.success("Job deleted");
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Job
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
