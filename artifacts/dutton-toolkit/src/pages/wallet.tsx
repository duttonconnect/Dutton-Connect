import { useEffect, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Loader2,
  Plus,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore";

import { db, isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type WalletData = {
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalSpent: number;
};

export type WalletTransaction = {
  id: string;
  type: "credit" | "debit" | "pending";
  amount: number;
  description: string;
  category: "quote_accepted" | "job_completed" | "payout" | "payment" | "referral_bonus" | "other";
  status: "completed" | "pending" | "failed";
  createdAt: string;
};

const EMPTY_WALLET: WalletData = {
  availableBalance: 0,
  pendingBalance: 0,
  totalEarned: 0,
  totalSpent: 0,
};

const CATEGORY_LABELS: Record<WalletTransaction["category"], string> = {
  quote_accepted: "Quote Accepted",
  job_completed: "Job Completed",
  payout: "Payout",
  payment: "Payment",
  referral_bonus: "Referral Bonus",
  other: "Transaction",
};

function txIcon(tx: WalletTransaction) {
  if (tx.status === "pending") return <Clock className="h-4 w-4 text-amber-500" />;
  if (tx.type === "credit") return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
  return <ArrowUpRight className="h-4 w-4 text-red-400" />;
}

export default function WalletPage() {
  const { user, isConfigured } = useAuth();
  const [wallet, setWallet] = useState<WalletData>(EMPTY_WALLET);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        // Load wallet balance doc
        const wSnap = await getDoc(doc(db!, "wallets", user.uid));
        if (wSnap.exists()) {
          setWallet(wSnap.data() as WalletData);
        } else {
          // Create empty wallet doc on first visit
          await setDoc(doc(db!, "wallets", user.uid), EMPTY_WALLET, { merge: true });
        }
        // Load transactions
        const txSnap = await getDocs(
          query(
            collection(db!, "wallets", user.uid, "transactions"),
            orderBy("createdAt", "desc"),
          ),
        );
        setTransactions(
          txSnap.docs.map((d) => ({ id: d.id, ...d.data() } as WalletTransaction)),
        );
      } catch {
        // Offline mode — show zeroes
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.uid]);

  const balanceCards = [
    {
      label: "Available Balance",
      value: wallet.availableBalance,
      sub: "Ready to use or withdraw",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Pending Balance",
      value: wallet.pendingBalance,
      sub: "Processing — usually 1–3 days",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Total Earned",
      value: wallet.totalEarned,
      sub: "All time",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Spent",
      value: wallet.totalSpent,
      sub: "All time",
      color: "text-gray-700",
      bg: "bg-gray-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
          <p className="text-sm text-muted-foreground">
            Your balance, earnings, and transaction history.
          </p>
        </div>
      </div>

      {!isConfigured && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Sign in to sync your wallet across devices.
        </div>
      )}

      {/* Payments coming soon banner */}
      <div className="rounded-xl bg-gradient-to-br from-primary to-blue-700 text-white p-5 space-y-1.5">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          <span className="font-semibold">Dutton Pay — Coming Soon</span>
        </div>
        <p className="text-blue-100 text-sm">
          Pay pros, receive payments, and manage your balance — all inside Dutton Connect.
          Stripe integration and instant payouts are on the way.
        </p>
        <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 mt-1">
          Placeholder — no real money involved
        </Badge>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {balanceCards.map(({ label, value, sub, color, bg }) => (
          <Card key={label}>
            <CardContent className={`p-4 rounded-xl ${bg}`}>
              <div className={`text-xl font-bold ${color}`}>
                ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-semibold text-gray-700 mt-0.5">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action buttons (placeholder) */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled className="gap-2">
          <Plus className="h-4 w-4" /> Add Funds
          <Badge variant="secondary" className="ml-1 text-xs">Soon</Badge>
        </Button>
        <Button variant="outline" disabled className="gap-2">
          <ArrowUpRight className="h-4 w-4" /> Withdraw
          <Badge variant="secondary" className="ml-1 text-xs">Soon</Badge>
        </Button>
      </div>

      {/* Transaction history */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <Wallet className="h-10 w-10 mx-auto opacity-20" />
              <p className="text-sm text-muted-foreground font-medium">
                No transactions yet
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                When you accept quotes, complete jobs, or receive payments, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 py-3">
                  <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    {txIcon(tx)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-tight">
                      {tx.description || CATEGORY_LABELS[tx.category]}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(tx.createdAt), "MMM d, yyyy")}
                      </span>
                      {tx.status === "pending" && (
                        <Badge variant="secondary" className="text-xs py-0">Pending</Badge>
                      )}
                      {tx.status === "completed" && (
                        <span className="flex items-center gap-0.5 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold shrink-0 ${
                    tx.type === "credit" ? "text-green-600" :
                    tx.status === "pending" ? "text-amber-600" : "text-gray-700"
                  }`}>
                    {tx.type === "credit" ? "+" : tx.type === "debit" ? "−" : ""}
                    ${tx.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rewards teaser */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-4 text-sm space-y-1">
        <div className="font-semibold text-gray-800">Rewards &amp; Boosts — Coming Soon</div>
        <p className="text-muted-foreground text-xs">
          Earn cash back for referrals, bonus payouts for top-rated pros, and loyalty rewards for repeat customers.
        </p>
      </div>
    </div>
  );
}
