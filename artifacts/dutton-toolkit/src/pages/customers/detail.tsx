import { useAppStore } from "@/lib/store";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, MapPin, Hammer, FileText, DollarSign, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function CustomerDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { customers, jobs, quotes, payments, deleteCustomer } = useAppStore();

  const customer = customers.find(c => c.id === id);

  if (!customer) {
    return <div className="p-8 text-center text-muted-foreground">Customer not found</div>;
  }

  const customerJobs = jobs.filter(j => j.customerId === customer.id);
  const customerQuotes = quotes.filter(q => q.customerId === customer.id);
  
  // Total billed could be sum of all payments for their jobs
  const customerPayments = payments.filter(p => p.jobId && customerJobs.some(j => j.id === p.jobId));
  const totalPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this customer? This will NOT delete their jobs or quotes, but they will be orphaned.")) {
      deleteCustomer(customer.id);
      setLocation("/customers");
      toast.success("Customer deleted");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
        </div>
        <div className="flex gap-2">
          {/* Edit button placeholder for now */}
          <Button variant="outline" onClick={() => alert("Edit customer functionality")}><Pencil className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Edit</span></Button>
          <Button variant="ghost" className="text-destructive" onClick={handleDelete}><Trash2 className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Delete</span></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <a href={`tel:${customer.phone}`} className="text-primary hover:underline">{customer.phone}</a>
                </div>
              </div>
              {customer.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <a href={`mailto:${customer.email}`} className="text-primary hover:underline">{customer.email}</a>
                  </div>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-muted-foreground">{customer.address}</div>
                </div>
              )}
              {customer.notes && (
                <div className="pt-4 border-t mt-4">
                  <div className="font-medium mb-1">Notes</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.notes}</div>
                </div>
              )}
              <div className="pt-4 border-t mt-4 text-xs text-muted-foreground">
                Customer since {format(new Date(customer.createdAt), "MMM yyyy")}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${totalPaid.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1">Across {customerPayments.length} payments</div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-lg flex items-center gap-2"><Hammer className="h-5 w-5 text-muted-foreground"/> Jobs</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/jobs/new"><Plus className="h-4 w-4 mr-1" /> New Job</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customerJobs.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">No jobs for this customer</div>
                ) : (
                  customerJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(job => (
                    <Link key={job.id} href={`/jobs/${job.id}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors gap-2 cursor-pointer">
                        <div>
                          <div className="font-medium">{job.title}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(job.scheduledDate), "MMM d, yyyy")}</div>
                        </div>
                        <Badge variant={job.status === 'completed' ? 'default' : 'secondary'} className="w-fit text-xs">
                          {job.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-muted-foreground"/> Quotes</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/quotes/new"><Plus className="h-4 w-4 mr-1" /> New Quote</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customerQuotes.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">No quotes for this customer</div>
                ) : (
                  customerQuotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(quote => {
                    const subtotal = quote.lineItems.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0);
                    const total = subtotal * (1 + quote.taxRate / 100);
                    return (
                      <Link key={quote.id} href={`/quotes/${quote.id}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors gap-2 cursor-pointer">
                          <div>
                            <div className="font-medium">Quote #{quote.id.toUpperCase()}</div>
                            <div className="text-xs text-muted-foreground">{format(new Date(quote.createdAt), "MMM d, yyyy")}</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-sm font-medium">${total.toFixed(2)}</span>
                            <Badge variant="outline" className="w-fit text-xs uppercase">
                              {quote.status}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Need to define Plus locally if not imported
import { Plus } from "lucide-react";
