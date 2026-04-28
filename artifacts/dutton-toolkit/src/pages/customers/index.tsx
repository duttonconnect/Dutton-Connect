import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { useState } from "react";

export default function CustomersList() {
  const { customers, deleteCustomer } = useAppStore();
  const [search, setSearch] = useState("");

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-gray-500">Manage your client base.</p>
        </div>
        {/* We can add a simple dialog for new customer if needed, but the prompt says new customer is inline on jobs page. We'll leave the button that alerts. */}
        <Button onClick={() => alert("Customer creation handled via jobs page currently.")}><Plus className="mr-2 h-4 w-4" /> New Customer</Button>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search customers..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 max-w-md"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No customers found.
              </div>
            ) : (
              filteredCustomers.map(customer => (
                <Link key={customer.id} href={`/customers/${customer.id}`}>
                  <div className="p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col">
                    <div className="font-bold text-lg mb-1">{customer.name}</div>
                    <div className="space-y-1 text-sm text-muted-foreground flex-1">
                      <div>{customer.phone}</div>
                      {customer.email && <div className="truncate" title={customer.email}>{customer.email}</div>}
                      <div className="truncate" title={customer.address}>{customer.address || "No address on file"}</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
