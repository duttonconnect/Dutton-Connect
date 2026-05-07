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
  | "House Cleaning"
  | "Handyman"
  | "Plumbing"
  | "Automotive"
  | "Pressure Washing"
  | "Yard Work"
  | "Appliance Installation"
  | "Other";

export const REQUEST_CATEGORIES: RequestCategory[] = [
  "House Cleaning",
  "Handyman",
  "Plumbing",
  "Automotive",
  "Pressure Washing",
  "Yard Work",
  "Appliance Installation",
  "Other",
];

export type Urgency = "Low" | "Normal" | "Urgent" | "Soon" | "Emergency";

export type HomeProfile = {
  homeType: "house" | "apartment" | "condo" | "townhouse" | "other";
  address: string;
  squareFootage: string;
  yearBuilt: string;
  bedrooms: string;
  bathrooms: string;
  parkingNotes: string;
  accessNotes: string;
  updatedAt: string;
};

export type ServiceReminder = {
  id: string;
  title: string;
  category: string;
  intervalDays: number;
  lastDone: string;
  nextDue: string;
  notes: string;
  createdAt: string;
};

export type JobPhoto = {
  id: string;
  jobRequestId: string;
  propertyAddress: string;
  beforeDataUrl?: string;
  afterDataUrl?: string;
  proName?: string;
  serviceType: string;
  completedDate: string;
  notes: string;
  createdAt: string;
};

export type Warranty = {
  id: string;
  jobRequestId: string;
  proId: string;
  proName: string;
  serviceDescription: string;
  propertyAddress: string;
  completedDate: string;
  warrantyDays: number;
  expiresAt: string;
  notes: string;
  createdAt: string;
};

export type BundleRequest = {
  id: string;
  title: string;
  category: RequestCategory;
  description: string;
  address: string;
  budget: number;
  urgency: Urgency;
  createdBy: string;
  participants: string[];
  maxParticipants: number;
  status: "open" | "full" | "closed";
  createdAt: string;
};

export type AvailabilitySlot = {
  id: string;
  proId: string;
  proName: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceTypes: string[];
  location: string;
  notes: string;
  bookedBy?: string;
  createdAt: string;
};

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
  homeProfile: HomeProfile | null;
  serviceReminders: ServiceReminder[];
  jobPhotos: JobPhoto[];
  warranties: Warranty[];
  bundleRequests: BundleRequest[];
};

type AppContextType = AppState & {
  routePlannerDirty: boolean;
  setRoutePlannerDirty: (dirty: boolean) => void;
  routePlannerHasContent: boolean;
  setRoutePlannerHasContent: (has: boolean) => void;

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

  setHomeProfile: (p: HomeProfile) => void;

  addServiceReminder: (r: Omit<ServiceReminder, "id" | "createdAt">) => void;
  updateServiceReminder: (id: string, r: Partial<ServiceReminder>) => void;
  deleteServiceReminder: (id: string) => void;

  addJobPhoto: (p: Omit<JobPhoto, "id" | "createdAt">) => void;
  deleteJobPhoto: (id: string) => void;

  addWarranty: (w: Omit<Warranty, "id" | "createdAt">) => void;
  deleteWarranty: (id: string) => void;

  addBundleRequest: (b: Omit<BundleRequest, "id" | "createdAt">) => void;
  joinBundleRequest: (id: string, userId: string) => void;
  deleteBundleRequest: (id: string) => void;

  loadState: (s: Partial<AppState>) => void;
};

const SEED_DATA: AppState = {
  customers: [],
  jobs: [],
  quotes: [],
  payments: [],
  trips: [],
  receipts: [],
  jobRequests: [],
  homeProfile: null,
  serviceReminders: [],
  jobPhotos: [],
  warranties: [],
  bundleRequests: [],
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

  const [routePlannerDirty, setRoutePlannerDirty] = useState(false);
  const [routePlannerHasContent, setRoutePlannerHasContent] = useState(false);

  useEffect(() => {
    localStorage.setItem("dutton_toolkit_state", JSON.stringify(state));
  }, [state]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const value: AppContextType = {
    ...state,
    routePlannerDirty,
    setRoutePlannerDirty,
    routePlannerHasContent,
    setRoutePlannerHasContent,
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

    setHomeProfile: (p) => setState(s => ({ ...s, homeProfile: p })),

    addServiceReminder: (r) => setState(s => ({ ...s, serviceReminders: [...(s.serviceReminders ?? []), { ...r, id: generateId(), createdAt: new Date().toISOString() }] })),
    updateServiceReminder: (id, r) => setState(s => ({ ...s, serviceReminders: (s.serviceReminders ?? []).map(x => x.id === id ? { ...x, ...r } : x) })),
    deleteServiceReminder: (id) => setState(s => ({ ...s, serviceReminders: (s.serviceReminders ?? []).filter(x => x.id !== id) })),

    addJobPhoto: (p) => setState(s => ({ ...s, jobPhotos: [...(s.jobPhotos ?? []), { ...p, id: generateId(), createdAt: new Date().toISOString() }] })),
    deleteJobPhoto: (id) => setState(s => ({ ...s, jobPhotos: (s.jobPhotos ?? []).filter(x => x.id !== id) })),

    addWarranty: (w) => setState(s => ({ ...s, warranties: [...(s.warranties ?? []), { ...w, id: generateId(), createdAt: new Date().toISOString() }] })),
    deleteWarranty: (id) => setState(s => ({ ...s, warranties: (s.warranties ?? []).filter(x => x.id !== id) })),

    addBundleRequest: (b) => setState(s => ({ ...s, bundleRequests: [...(s.bundleRequests ?? []), { ...b, id: generateId(), createdAt: new Date().toISOString() }] })),
    joinBundleRequest: (id, userId) => setState(s => ({
      ...s,
      bundleRequests: (s.bundleRequests ?? []).map(b => {
        if (b.id !== id) return b;
        const participants = b.participants.includes(userId) ? b.participants : [...b.participants, userId];
        const status: BundleRequest["status"] = participants.length >= b.maxParticipants ? "full" : "open";
        return { ...b, participants, status };
      }),
    })),
    deleteBundleRequest: (id) => setState(s => ({ ...s, bundleRequests: (s.bundleRequests ?? []).filter(x => x.id !== id) })),

    loadState: (incoming) => setState(s => ({
      customers: incoming.customers ?? s.customers,
      jobs: incoming.jobs ?? s.jobs,
      quotes: incoming.quotes ?? s.quotes,
      payments: incoming.payments ?? s.payments,
      trips: incoming.trips ?? s.trips,
      receipts: incoming.receipts ?? s.receipts,
      jobRequests: incoming.jobRequests ?? s.jobRequests,
      homeProfile: incoming.homeProfile ?? s.homeProfile,
      serviceReminders: incoming.serviceReminders ?? s.serviceReminders,
      jobPhotos: incoming.jobPhotos ?? s.jobPhotos,
      warranties: incoming.warranties ?? s.warranties,
      bundleRequests: incoming.bundleRequests ?? s.bundleRequests,
    })),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within an AppProvider");
  return context;
};
