import { useEffect, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  Gift,
  Copy,
  Check,
  Users,
  Loader2,
  Share2,
  ExternalLink,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";

import { db, isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type ReferralDoc = {
  referrerId: string;
  referredUserId: string;
  referredEmail?: string;
  createdAt: string;
};

function generateCode(uid: string): string {
  return ("DC" + uid.slice(0, 5).toUpperCase()).replace(/[^A-Z0-9]/g, "X");
}

function getOrCreateLocalCode(uid: string): string {
  const key = `dutton_referral_code_${uid}`;
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const code = generateCode(uid);
  localStorage.setItem(key, code);
  return code;
}

export default function ReferralsPage() {
  const { user, isConfigured } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<ReferralDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const code = getOrCreateLocalCode(user.uid);
    setReferralCode(code);

    const load = async () => {
      if (!isFirebaseConfigured || !db) { setLoading(false); return; }
      try {
        // Ensure the user's referral code doc exists in Firestore
        const codeRef = doc(db, "referralCodes", user.uid);
        const codeSnap = await getDoc(codeRef);
        if (!codeSnap.exists()) {
          await setDoc(codeRef, { code, userId: user.uid, createdAt: new Date().toISOString() }, { merge: true });
        }
        // Load referrals where this user is the referrer
        const snap = await getDocs(
          query(collection(db, "referrals"), where("referrerId", "==", user.uid))
        );
        setReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() } as ReferralDoc & { id: string })));
      } catch {
        // Offline graceful fallback
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.uid]);

  const referralLink = `${window.location.origin}${import.meta.env.BASE_URL}signup?ref=${referralCode}`;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on Dutton Connect",
          text: "Find local pros for any home service — cleaning, handyman, plumbing, and more.",
          url: referralLink,
        });
      } catch {}
    } else {
      handleCopy(referralLink);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invite Friends</h1>
          <p className="text-sm text-muted-foreground">
            Share Dutton Connect with people you know.
          </p>
        </div>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-6 w-6" />
          <span className="text-xl font-bold">Refer &amp; Earn</span>
        </div>
        <p className="text-blue-100 text-sm leading-relaxed">
          Share your referral link with friends, neighbors, and local businesses.
          Every person who joins through your link is tracked to your account.
        </p>
        <div className="rounded-lg bg-white/15 border border-white/20 px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-blue-200 font-medium uppercase tracking-wider mb-1">Your referral code</div>
            <div className="text-2xl font-bold tracking-widest">{referralCode || "Loading…"}</div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="shrink-0"
            onClick={() => handleCopy(referralCode)}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Referral link */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="flex gap-2">
            <Input
              readOnly
              value={referralLink}
              className="flex-1 text-xs text-gray-600 bg-gray-50"
              onFocus={(e) => e.target.select()}
            />
            <Button size="sm" onClick={() => handleCopy(referralLink)}>
              {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleShare}>
              <Share2 className="mr-2 h-3.5 w-3.5" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a href={referralLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Preview
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">
              {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : referrals.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">People Invited</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-gray-400">$0</div>
            <div className="text-xs text-muted-foreground mt-1">Rewards Earned</div>
            <Badge variant="secondary" className="mt-1 text-xs">Coming Soon</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Invited users list */}
      {referrals.length > 0 && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              People You've Referred ({referrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 divide-y">
            {referrals.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {r.referredEmail ?? "New member"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Joined {format(new Date(r.createdAt), "MMM d, yyyy")}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rewards teaser */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-1.5">
        <div className="font-semibold text-gray-800 flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          Rewards &amp; Boosts — Coming Soon
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Earn credits when your referrals book their first job. Pros who refer other pros
          get priority placement in search results. Rewards rollout is coming in a future update.
        </p>
      </div>

      {!isConfigured && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Sign in to track your referrals across devices and receive rewards when they launch.
        </div>
      )}
    </div>
  );
}
