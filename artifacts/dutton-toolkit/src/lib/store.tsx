import React, { createContext, useContext, useEffect, useState } from "react";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
};

export type TimeEntry = {
  id: string;
  date: string;
  hours: number;
  description: string;
};

export type Material = {
  id: string;
  description: string;
  cost: number;
};

export type Job = {
  id: string;
  title: string;
  customerId: string;
  address: string;
  latitude?: number;
  longitude?: number;
  scheduledDate: string;
  estimatedHours: number;
  hourlyRate: number;
  materialsCost: number;
  description: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  notes: string;
  timeEntries: TimeEntry[];
  materials: Material[];
  createdAt: string;
};

export type LineItem = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
};

export type Quote = {
  id: string;
  customerId: string;
  jobId?: string;
  lineItems: LineItem[];
  notes: string;
  taxRate: number;
  status: "draft" | "sent" | "accepted" | "declined";
  createdAt: string;
};

export type Payment = {
  id: string;
  jobId?: string;
  amount: number;
  method: "cash" | "check" | "card" | "transfer";
  date: string;
  notes: string;
};

export type Trip = {
  id: string;
  purpose: string;
  startLocation: string;
  endLocation: string;
  jobCustomer: string;
  miles: number;
  startedAt: string;
  endedAt: string;
};

export type ReceiptCategory =
  | "Gas"
  | "Tools"
  | "Materials"
  | "Vehicle Repair"
  | "Advertising"
  | "Phone"
  | "Insurance"
  | "Supplies"
  | "Contract Labor"
  | "Other";

export const RECEIPT_CATEGORIES: ReceiptCategory[] = [
  "Gas",
  "Tools",
  "Materials",
  "Vehicle Repair",
  "Advertising",
  "Phone",
  "Insurance",
  "Supplies",
  "Contract Labor",
  "Other",
];

export type Receipt = {
  id: string;
  vendor: string;
  date: string;
  amount: number;
  category: ReceiptCategory;
  notes: string;
  imageDataUrl?: string;
  createdAt: string;
};

export type RequestCategory =
  | "Handyman"
  | "Plumbing"
  | "Automotive"
  | "Pressure Washing"
  | "Yard Work"
  | "Appliance Installation"
  | "Other";

export const REQUEST_CATEGORIES: RequestCategory[] = [
  "Handyman",
  "Plumbing",
  "Automotive",
  "Pressure Washing",
  "Yard Work",
  "Appliance Installation",
  "Other",
];

export type Urgency = "Low" | "Normal" | "Urgent";

export type JobRequest = {
  id: string;
  title: string;
  category: RequestCategory;
  description: string;
  address: string;
  budget: number;
  preferredDate: string;
  urgency: Urgency;
  photoDataUrl?: string;
  customerId?: string;
  status?: "open" | "closed";
  createdAt: string;
};

type AppState = {
  customers: Customer[];
  jobs: Job[];
  quotes: Quote[];
  payments: Payment[];
  trips: Trip[];
  receipts: Receipt[];
  jobRequests: JobRequest[];
};

type AppContextType = AppState & {
  addCustomer: (c: Omit<Customer, "id" | "createdAt">) => void;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  
  addJob: (j: Omit<Job, "id" | "createdAt" | "timeEntries" | "materials">) => void;
  updateJob: (id: string, j: Partial<Job>) => void;
  deleteJob: (id: string) => void;
  
  addQuote: (q: Omit<Quote, "id" | "createdAt">) => void;
  updateQuote: (id: string, q: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  
  addPayment: (p: Omit<Payment, "id">) => void;
  deletePayment: (id: string) => void;

  addTrip: (t: Omit<Trip, "id">) => void;
  deleteTrip: (id: string) => void;

  addReceipt: (r: Omit<Receipt, "id" | "createdAt">) => void;
  deleteReceipt: (id: string) => void;

  addJobRequest: (r: Omit<JobRequest, "id" | "createdAt"> & { id?: string }) => void;
  deleteJobRequest: (id: string) => void;

  loadState: (s: Partial<AppState>) => void;
};

const SEED_DATA: AppState = {
  customers: [
    { id: "c1", name: "Sarah Jenkins", phone: "706-555-0198", email: "sjenkins@example.com", address: "142 Oak St, Athens, GA", notes: "Prefers texts", createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
    { id: "c2", name: "Marcus Thompson", phone: "706-555-4432", email: "mthompson88@example.com", address: "89 Pine Ridge Rd, Watkinsville, GA", notes: "Gate code 4821", createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
    { id: "c3", name: "Elena Rodriguez", phone: "706-555-8810", email: "erodriguez@example.com", address: "2204 Sycamore Ln, Bogart, GA", notes: "Large dog in backyard, friendly", createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  ],
  jobs: [
    {
      id: "j1", title: "Deck Board Replacement", customerId: "c1", address: "142 Oak St, Athens, GA", latitude: 33.9519, longitude: -83.3576, scheduledDate: new Date().toISOString(), estimatedHours: 4, hourlyRate: 75, materialsCost: 120, description: "Replace 4 rotted boards on back deck and reinforce stairs", status: "in_progress", notes: "Found some additional rot near the ledger board, need to discuss with Sarah.", timeEntries: [{ id: "t1", date: new Date().toISOString(), hours: 2, description: "Demolition and measurements" }], materials: [{ id: "m1", description: "Pressure treated 2x6x8 (x4)", cost: 48 }, { id: "m2", description: "Deck screws and brackets", cost: 35 }], createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "j2", title: "Master Bath Faucet Install", customerId: "c2", address: "89 Pine Ridge Rd, Watkinsville, GA", latitude: 33.8624, longitude: -83.4082, scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), estimatedHours: 2, hourlyRate: 75, materialsCost: 0, description: "Install customer-provided Moen faucet in master bathroom", status: "scheduled", notes: "", timeEntries: [], materials: [], createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "j3", title: "Drywall Patch - Living Room", customerId: "c3", address: "2204 Sycamore Ln, Bogart, GA", latitude: 33.9484, longitude: -83.5302, scheduledDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), estimatedHours: 3, hourlyRate: 75, materialsCost: 45, description: "Patch 2x2 hole in drywall, texture to match", status: "completed", notes: "Texture matched perfectly.", timeEntries: [{ id: "t2", date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), hours: 3, description: "Patch, mud, texture" }], materials: [{ id: "m3", description: "Drywall square, joint compound", cost: 45 }], createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  quotes: [
    {
      id: "q1", customerId: "c2", lineItems: [{ id: "l1", description: "Gate rebuild - labor", qty: 8, unitPrice: 75 }, { id: "l2", description: "Lumber and hardware", qty: 1, unitPrice: 350 }], notes: "Complete tear down and rebuild of double drive gate.", taxRate: 7, status: "sent", createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  payments: [
    {
      id: "p1", jobId: "j3", amount: 270, method: "card", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), notes: "Paid via Square"
    }
  ],
  trips: [],
  receipts: [],
  jobRequests: []
};

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const stored = localStorage.getItem("dutton_toolkit_state");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse stored state", e);
    }
    return SEED_DATA;
  });

  useEffect(() => {
    localStorage.setItem("dutton_toolkit_state", JSON.stringify(state));
  }, [state]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const value: AppContextType = {
    ...state,
    addCustomer: (c) => setState(s => ({ ...s, customers: [...s.customers, { ...c, id: generateId(), createdAt: new Date().toISOString() }] })),
    updateCustomer: (id, c) => setState(s => ({ ...s, customers: s.customers.map(x => x.id === id ? { ...x, ...c } : x) })),
    deleteCustomer: (id) => setState(s => ({ ...s, customers: s.customers.filter(x => x.id !== id) })),
    
    addJob: (j) => setState(s => ({ ...s, jobs: [...s.jobs, { ...j, id: generateId(), createdAt: new Date().toISOString(), timeEntries: [], materials: [] }] })),
    updateJob: (id, j) => setState(s => ({ ...s, jobs: s.jobs.map(x => x.id === id ? { ...x, ...j } : x) })),
    deleteJob: (id) => setState(s => ({ ...s, jobs: s.jobs.filter(x => x.id !== id) })),
    
    addQuote: (q) => setState(s => ({ ...s, quotes: [...s.quotes, { ...q, id: generateId(), createdAt: new Date().toISOString() }] })),
    updateQuote: (id, q) => setState(s => ({ ...s, quotes: s.quotes.map(x => x.id === id ? { ...x, ...q } : x) })),
    deleteQuote: (id) => setState(s => ({ ...s, quotes: s.quotes.filter(x => x.id !== id) })),

    addPayment: (p) => setState(s => ({ ...s, payments: [...s.payments, { ...p, id: generateId() }] })),
    deletePayment: (id) => setState(s => ({ ...s, payments: s.payments.filter(x => x.id !== id) })),

    addTrip: (t) => setState(s => ({ ...s, trips: [...(s.trips ?? []), { ...t, id: generateId() }] })),
    deleteTrip: (id) => setState(s => ({ ...s, trips: (s.trips ?? []).filter(x => x.id !== id) })),

    addReceipt: (r) => setState(s => ({ ...s, receipts: [...(s.receipts ?? []), { ...r, id: generateId(), createdAt: new Date().toISOString() }] })),
    deleteReceipt: (id) => setState(s => ({ ...s, receipts: (s.receipts ?? []).filter(x => x.id !== id) })),

    addJobRequest: (r) => {
      const { id: presetId, ...rest } = r as JobRequest;
      const id = presetId && presetId !== "" ? presetId : generateId();
      setState(s => ({ ...s, jobRequests: [...(s.jobRequests ?? []), { ...rest, id, createdAt: new Date().toISOString() }] }));
    },
    deleteJobRequest: (id) => setState(s => ({ ...s, jobRequests: (s.jobRequests ?? []).filter(x => x.id !== id) })),

    loadState: (incoming) => setState(s => ({
      customers: incoming.customers ?? s.customers,
      jobs: incoming.jobs ?? s.jobs,
      quotes: incoming.quotes ?? s.quotes,
      payments: incoming.payments ?? s.payments,
      trips: incoming.trips ?? s.trips,
      receipts: incoming.receipts ?? s.receipts,
      jobRequests: incoming.jobRequests ?? s.jobRequests,
    })),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within an AppProvider");
  return context;
};
