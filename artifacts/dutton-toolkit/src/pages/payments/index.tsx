import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Plus, DollarSign, Search } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function PaymentsList() {
  const { payments, jobs, customers, addPayment, deletePayment } = useAppStore();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const monthTotal = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  // New Payment Form State
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "check" | "card" | "transfer">("card");
  const [jobId, setJobId] = useState("unlinked");
  const [notes, setNotes] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    addPayment({
      amount: parseFloat(amount),
      method,
      jobId: jobId === "unlinked" ? undefined : jobId,
      date: new Date().toISOString(),
      notes
    });

    toast.success("Payment recorded successfully");
    setIsDialogOpen(false);
    setAmount("");
    setNotes("");
    setJobId("unlinked");
  };

  const filteredPayments = payments.filter(p => {
    const job = p.jobId ? jobs.find(j => j.id === p.jobId) : null;
    const customer = job ? customers.find(c => c.id === job.customerId) : null;
    const searchString = `${p.notes} ${job?.title || ''} ${customer?.name || ''}`.toLowerCase();
    return searchString.includes(search.toLowerCase());
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-gray-500">Track incoming revenue.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Record Payment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label>Amount ($)</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus />
              </div>
              <div>
                <Label>Method</Label>
                <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Credit Card (Square/Stripe)</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="transfer">Bank Transfer / Zelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Link to Job (Optional)</Label>
                <Select value={jobId} onValueChange={setJobId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlinked">-- General / Unlinked --</SelectItem>
                    {jobs.filter(j => j.status !== "cancelled").map(j => {
                      const c = customers.find(x => x.id === j.customerId);
                      return <SelectItem key={j.id} value={j.id}>{j.title} ({c?.name})</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Receipt number, etc." />
              </div>
              <Button type="submit" className="w-full">Save Payment</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-80">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${monthTotal.toFixed(2)}</div>
            <p className="text-xs opacity-80 mt-1">{thisMonthPayments.length} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Lifetime Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalReceived.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{payments.length} total transactions</p>
          </CardContent>
        </Card>
        <Card className="border-dashed flex items-center justify-center text-center p-6 text-muted-foreground">
          <div>
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <div className="text-sm font-medium">Keep it up!</div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b mb-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle>Transaction History</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No payments found.</div>
            ) : (
              filteredPayments.map(payment => {
                const job = payment.jobId ? jobs.find(j => j.id === payment.jobId) : null;
                const customer = job ? customers.find(c => c.id === job.customerId) : null;
                
                return (
                  <div key={payment.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex gap-4 items-center">
                      <div className="h-10 w-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0 hidden sm:flex">
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-lg">${payment.amount.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground flex gap-2 items-center flex-wrap">
                          <span className="capitalize font-medium text-gray-700">{payment.method}</span>
                          <span>•</span>
                          <span>{format(new Date(payment.date), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {job ? (
                        <>
                          <div className="font-medium text-sm text-primary hover:underline cursor-pointer truncate max-w-[150px] sm:max-w-[250px]" title={job.title}>
                            {job.title}
                          </div>
                          <div className="text-xs text-muted-foreground">{customer?.name}</div>
                        </>
                      ) : (
                        <div className="text-sm italic text-muted-foreground">General Payment</div>
                      )}
                      {payment.notes && <div className="text-xs text-muted-foreground mt-1 truncate max-w-[150px]" title={payment.notes}>{payment.notes}</div>}
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
