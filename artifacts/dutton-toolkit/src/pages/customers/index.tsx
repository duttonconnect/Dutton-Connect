import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function CustomersList() {
  const { customers } = useAppStore();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
      </div>
      <div className="space-y-4">
        {customers.map(c => (
          <div key={c.id} className="p-4 border rounded">{c.name} - {c.phone}</div>
        ))}
      </div>
    </div>
  );
}
