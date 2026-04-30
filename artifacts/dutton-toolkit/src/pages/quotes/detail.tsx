import { useAppStore } from "@/lib/store";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft, Printer, Trash2, Send, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function QuoteDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { quotes, customers, updateQuote, deleteQuote } = useAppStore();

  const quote = quotes.find(q => q.id === id);
  const customer = quote ? customers.find(c => c.id === quote.customerId) : null;

  if (!quote || !customer) {
    return <div className="p-8 text-center text-muted-foreground">Quote not found</div>;
  }

  const subtotal = quote.lineItems.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0);
  const tax = subtotal * (quote.taxRate / 100);
  const total = subtotal + tax;

  const handleStatusChange = (status: "draft" | "sent" | "accepted" | "declined") => {
    updateQuote(quote.id, { status });
    toast.success(`Quote marked as ${status}`);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this quote?")) {
      deleteQuote(quote.id);
      setLocation("/quotes");
      toast.success("Quote deleted");
    }
  };

  return (
    <div className="space-y-6">
      {/* Non-printable controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/quotes">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Quote #{quote.id.toUpperCase()}</h1>
            <Badge variant="outline" className="uppercase">{quote.status}</Badge>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {quote.status === 'draft' && (
            <Button onClick={() => handleStatusChange("sent")} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="mr-2 h-4 w-4" /> Mark Sent
            </Button>
          )}
          {quote.status === 'sent' && (
            <>
              <Button onClick={() => handleStatusChange("accepted")} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="mr-2 h-4 w-4" /> Accept
              </Button>
              <Button variant="destructive" onClick={() => handleStatusChange("declined")}>
                <XCircle className="mr-2 h-4 w-4" /> Decline
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print / PDF
          </Button>
          <Button variant="ghost" className="text-destructive px-2" onClick={handleDelete}>
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Printable Document */}
      <Card className="print:shadow-none print:border-0 max-w-4xl mx-auto bg-white text-black">
        <CardContent className="p-8 sm:p-12 space-y-10">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-8">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tighter text-blue-800">QUOTE</h1>
              <div className="text-sm font-semibold tracking-widest text-gray-500 uppercase mt-1">Service Estimate</div>
            </div>
            <div className="text-right text-sm text-gray-600 space-y-1">
              <div className="text-gray-400">Quote Date: {format(new Date(quote.createdAt), "MMM d, yyyy")}</div>
              <div className="text-gray-400">Valid for 30 days</div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="flex justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Prepared For</div>
              <div className="font-bold text-lg">{customer.name}</div>
              <div className="text-gray-600">{customer.address}</div>
              <div className="text-gray-600">{customer.phone}</div>
              <div className="text-gray-600">{customer.email}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Quote Reference</div>
              <div className="font-mono text-lg font-bold text-gray-800">#{quote.id.toUpperCase()}</div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quote.lineItems.map((item) => (
                  <tr key={item.id} className="bg-white">
                    <td className="px-4 py-4">{item.description}</td>
                    <td className="px-4 py-4 text-center text-gray-600">{item.qty}</td>
                    <td className="px-4 py-4 text-right text-gray-600 font-mono">${item.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-4 text-right font-mono font-medium">${(item.qty * item.unitPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              {quote.notes && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Notes & Terms</div>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-100">{quote.notes}</div>
                </div>
              )}
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              {quote.taxRate > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax ({quote.taxRate}%)</span>
                  <span className="font-mono">${tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold border-t border-gray-200 pt-3 text-gray-900">
                <span>Total</span>
                <span className="font-mono">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-12 border-t border-gray-100 text-gray-500 text-sm">
            <p className="font-medium text-gray-700">Thank you — we appreciate your business.</p>
            <p className="mt-1">Please reach out with any questions about this quote.</p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
