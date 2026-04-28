import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { FileText, Plus } from "lucide-react";

export default function QuotesList() {
  const { quotes, customers } = useAppStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
          <p className="text-gray-500">Estimates and proposals.</p>
        </div>
        <Link href="/quotes/new">
          <Button><Plus className="mr-2 h-4 w-4" /> New Quote</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {quotes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No quotes created yet.</div>
            ) : (
              quotes.map(quote => {
                const customer = customers.find(c => c.id === quote.customerId);
                const subtotal = quote.lineItems.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0);
                const total = subtotal * (1 + quote.taxRate / 100);

                return (
                  <Link key={quote.id} href={`/quotes/${quote.id}`}>
                    <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-full text-primary shrink-0 hidden sm:block">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-bold text-lg">Quote for {customer?.name || "Unknown"}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Created {format(new Date(quote.createdAt), "MMM d, yyyy")}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 border-t pt-3 sm:border-0 sm:pt-0">
                        <div className="text-lg font-bold">${total.toFixed(2)}</div>
                        <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold
                          ${quote.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                            quote.status === 'declined' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                            quote.status === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}
                        >
                          {quote.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
