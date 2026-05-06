import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CustomersList() {
  const { customers, addCustomer } = useAppStore();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const handleOpenDialog = () => {
    setName(""); setPhone(""); setEmail(""); setAddress(""); setNotes("");
    setDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    addCustomer({ name: name.trim(), phone, email, address, notes });
    toast.success("Customer added.");
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-gray-500">Manage your client base.</p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="mr-2 h-4 w-4" /> New Customer
        </Button>
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
                <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">
                  {search ? "No customers match your search." : "No customers yet."}
                </p>
                {!search && (
                  <p className="text-xs mt-1">Add your first customer to get started.</p>
                )}
              </div>
            ) : (
              filteredCustomers.map(customer => (
                <Link key={customer.id} href={`/customers/${customer.id}`}>
                  <div className="p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col">
                    <div className="font-bold text-lg mb-1">{customer.name}</div>
                    <div className="space-y-1 text-sm text-muted-foreground flex-1">
                      <div>{customer.phone}</div>
                      {customer.email && (
                        <div className="truncate" title={customer.email}>{customer.email}</div>
                      )}
                      <div className="truncate" title={customer.address}>
                        {customer.address || "No address on file"}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="nc-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nc-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-phone">Phone</Label>
              <Input
                id="nc-phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-email">Email</Label>
              <Input
                id="nc-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-address">Address</Label>
              <Input
                id="nc-address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Main St, City, State"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-notes">Notes</Label>
              <Textarea
                id="nc-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any notes about this customer..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Customer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
