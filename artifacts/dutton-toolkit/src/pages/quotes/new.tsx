import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function NewQuote() {
  const { customers, addQuote } = useAppStore();
  const [, setLocation] = useLocation();

  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState("7.0");
  const [lineItems, setLineItems] = useState([
    { id: Math.random().toString(), description: "", qty: 1, unitPrice: 0 }
  ]);

  const subtotal = lineItems.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0);
  const tax = subtotal * (parseFloat(taxRate) / 100);
  const total = subtotal + tax;

  const handleSave = () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (lineItems.some(i => !i.description)) {
      toast.error("All line items must have a description");
      return;
    }

    addQuote({
      customerId,
      lineItems,
      notes,
      taxRate: parseFloat(taxRate),
      status: "draft"
    });
    
    toast.success("Quote created");
    setLocation("/quotes");
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { id: Math.random().toString(), description: "", qty: 1, unitPrice: 0 }]);
  };

  const updateItem = (id: string, field: string, value: any) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">New Quote</h1>
        <div className="flex gap-2">
          <Link href="/quotes"><Button variant="outline">Cancel</Button></Link>
          <Button onClick={handleSave}>Save Quote</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Line Items</h3>
            </div>
            
            <div className="border rounded-md divide-y overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm hidden sm:grid">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              
              {lineItems.map((item) => (
                <div key={item.id} className="p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-6">
                    <Label className="sm:hidden mb-1 block text-xs text-muted-foreground">Description</Label>
                    <Input 
                      value={item.description} 
                      onChange={e => updateItem(item.id, "description", e.target.value)} 
                      placeholder="e.g. Labor, Materials"
                    />
                  </div>
                  <div className="flex sm:contents gap-2">
                    <div className="flex-1 sm:col-span-2">
                      <Label className="sm:hidden mb-1 block text-xs text-muted-foreground">Qty</Label>
                      <Input 
                        type="number" min="0" step="0.5" 
                        value={item.qty} 
                        onChange={e => updateItem(item.id, "qty", parseFloat(e.target.value) || 0)} 
                        className="text-right"
                      />
                    </div>
                    <div className="flex-1 sm:col-span-2">
                      <Label className="sm:hidden mb-1 block text-xs text-muted-foreground">Unit Price ($)</Label>
                      <Input 
                        type="number" min="0" step="0.01" 
                        value={item.unitPrice} 
                        onChange={e => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)} 
                        className="text-right"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex justify-between sm:justify-end items-center">
                    <span className="sm:hidden text-sm font-medium">Total:</span>
                    <span className="font-mono">${(item.qty * item.unitPrice).toFixed(2)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 text-destructive" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <Button variant="outline" size="sm" onClick={addLineItem} className="w-full sm:w-auto mt-2">
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t">
            <div>
              <Label>Notes / Terms</Label>
              <Textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Scope of work details, payment terms..."
                className="min-h-[120px] mt-1"
              />
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  Tax Rate (%)
                  <Input 
                    type="number" 
                    step="0.1" 
                    className="w-20 h-7 text-right bg-white dark:bg-black" 
                    value={taxRate} 
                    onChange={e => setTaxRate(e.target.value)} 
                  />
                </span>
                <span className="font-mono">${tax.toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-bold text-lg">Total</span>
                <span className="font-mono text-xl font-bold">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
