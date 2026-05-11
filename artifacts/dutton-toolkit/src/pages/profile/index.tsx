import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Phone,
  Star,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/role";
import {
  BUSINESS_CATEGORIES,
  type BusinessCategory,
  loadBusinessProfile,
  saveBusinessProfile,
} from "@/lib/business-profile";
import { loadCustomerProfile, saveCustomerProfile } from "@/lib/customer-profile";
import { isFirebaseConfigured } from "@/lib/firebase";
import { loadReviewsForPro } from "@/lib/matching";

// ── Image resize util ─────────────────────────────────────────────────────────

async function resizeToBase64(file: File, maxPx = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > maxPx || h > maxPx) {
          const r = Math.min(maxPx / w, maxPx / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Clickable photo avatar ────────────────────────────────────────────────────

function PhotoAvatar({
  photo,
  name,
  onUpload,
  size = "lg",
}: {
  photo: string;
  name: string;
  onUpload: (b64: string) => void;
  size?: "lg" | "xl";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const dim = size === "xl" ? "h-28 w-28" : "h-24 w-24";
  const text = size === "xl" ? "text-3xl" : "text-2xl";

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await resizeToBase64(file, 400);
      onUpload(b64);
    } catch {
      toast.error("Could not load image. Try another file.");
    }
  };

  return (
    <div
      className={`relative ${dim} rounded-full overflow-hidden cursor-pointer group border-4 border-white shadow-md shrink-0`}
      onClick={() => ref.current?.click()}
      title="Click to change photo"
    >
      {photo ? (
        <img src={photo} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div
          className={`h-full w-full bg-primary flex items-center justify-center text-white font-bold ${text}`}
        >
          {initials || <User className="h-8 w-8" />}
        </div>
      )}
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Camera className="h-6 w-6 text-white" />
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ── Inline star rating display ────────────────────────────────────────────────

function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
        />
      ))}
      <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">
        ({count} review{count !== 1 ? "s" : ""})
      </span>
    </div>
  );
}

// ── Progress bar helper ───────────────────────────────────────────────────────

function ProfileProgress({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-amber-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Profile completeness</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const RADIUS_OPTIONS = [5, 10, 15, 25, 50, 75, 100];

// ─────────────────────────────────────────────────────────────────────────────
// Pro Profile Editor
// ─────────────────────────────────────────────────────────────────────────────

function ProProfileEdit() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [about, setAbout] = useState("");
  const [serviceCategories, setServiceCategories] = useState<BusinessCategory[]>([]);
  const [serviceArea, setServiceArea] = useState("");
  const [serviceRadius, setServiceRadius] = useState(25);
  const [yearsExperience, setYearsExperience] = useState(0);
  const [publicPhone, setPublicPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");

  const [reviewCount, setReviewCount] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([
      loadBusinessProfile(user.uid),
      loadReviewsForPro(user.uid),
    ]).then(([p, reviews]) => {
      if (p) {
        setBusinessName(p.businessName ?? "");
        setOwnerName(p.ownerName ?? "");
        setAbout(p.about ?? "");
        setServiceCategories((p.serviceCategories ?? []) as BusinessCategory[]);
        setServiceArea(p.serviceArea ?? "");
        setServiceRadius(p.serviceRadius ?? 25);
        setYearsExperience(p.yearsExperience ?? 0);
        setPublicPhone(p.publicPhone ?? "");
        setWebsite(p.website ?? "");
        setProfilePhoto(p.profilePhoto ?? "");
      } else {
        setOwnerName(user.displayName ?? "");
      }
      if (reviews.length > 0) {
        setReviewCount(reviews.length);
        setAvgRating(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length);
      }
      setLoading(false);
    });
  }, [user?.uid, authLoading]);

  const toggleCategory = (cat: BusinessCategory) => {
    setServiceCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const completeness = (() => {
    const fields = [
      businessName, ownerName, about, serviceArea, publicPhone,
      profilePhoto, serviceCategories.length > 0 ? "x" : "",
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

  const handleCopyLink = () => {
    if (!user) return;
    const url = `${window.location.origin}${import.meta.env.BASE_URL}pros/${user.uid}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!businessName.trim()) {
      toast.error("Business name is required.");
      return;
    }
    setSaving(true);
    const ok = await saveBusinessProfile(user.uid, {
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      serviceCategories,
      serviceArea: serviceArea.trim(),
      serviceRadius,
      about: about.trim(),
      yearsExperience: Number.isFinite(yearsExperience) ? yearsExperience : 0,
      website: website.trim() || undefined,
      publicPhone: publicPhone.trim() || undefined,
      profilePhoto: profilePhoto || undefined,
    });
    setSaving(false);
    if (ok) toast.success("Profile saved.");
    else toast.error("Save failed. Check your connection and try again.");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            My Profile
          </h1>
          <p className="text-sm text-gray-500">
            Your public-facing business profile.
          </p>
        </div>
      </div>

      {!isFirebaseConfigured && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">
            Firebase is not configured. Changes will not be saved.
          </CardContent>
        </Card>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">{reviewCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">
              {avgRating !== null ? avgRating.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg Rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">
              {yearsExperience > 0 ? yearsExperience : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Yrs Exp.</p>
          </CardContent>
        </Card>
      </div>

      {/* Photo + name */}
      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <PhotoAvatar
              photo={profilePhoto}
              name={businessName || ownerName}
              onUpload={setProfilePhoto}
              size="xl"
            />
            <div className="flex-1 space-y-3 w-full">
              <div className="space-y-1.5">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  placeholder="e.g. Smith's Plumbing & Repair"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ownerName">Your Name</Label>
                <Input
                  id="ownerName"
                  placeholder="Full name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  maxLength={60}
                />
              </div>
            </div>
          </div>
          <ProfileProgress pct={completeness} />
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">About Your Business</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="about">Bio / Description</Label>
            <Textarea
              id="about"
              placeholder="Tell customers about your experience, specialties, and what makes you stand out."
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {about.length}/1000
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="yearsExp">Years in Business</Label>
            <Input
              id="yearsExp"
              type="number"
              min={0}
              max={60}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(Number(e.target.value))}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Services Offered</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BUSINESS_CATEGORIES.map((cat) => {
              const selected = serviceCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-colors ${
                    selected
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white text-gray-700 border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Service Area */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Service Area
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="serviceArea">City / Area</Label>
            <Input
              id="serviceArea"
              placeholder="e.g. Athens, GA"
              value={serviceArea}
              onChange={(e) => setServiceArea(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Service Radius</Label>
            <Select
              value={String(serviceRadius)}
              onValueChange={(v) => setServiceRadius(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r} miles
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Contact Info
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Public Phone</Label>
            <Input
              id="phone"
              placeholder="(555) 555-5555"
              value={publicPhone}
              onChange={(e) => setPublicPhone(e.target.value)}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              Shown to customers on your profile.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">
              <Globe className="h-3.5 w-3.5 inline mr-1" />
              Website
            </Label>
            <Input
              id="website"
              placeholder="https://yoursite.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              maxLength={200}
            />
          </div>
        </CardContent>
      </Card>

      {/* Public profile link */}
      {user && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Your public profile
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Share this link so customers can find and review you.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-800 hover:bg-blue-100"
              onClick={handleCopyLink}
            >
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Link href={`/pros/${user.uid}`}>
              <Button
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-800 hover:bg-blue-100"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                View
              </Button>
            </Link>
          </div>
        </div>
      )}

      <Button
        onClick={handleSave}
        className="w-full"
        size="lg"
        disabled={saving || !isFirebaseConfigured}
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
          </>
        ) : (
          "Save Profile"
        )}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer Profile Editor
// ─────────────────────────────────────────────────────────────────────────────

function CustomerProfileEdit() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    loadCustomerProfile(user.uid).then((p) => {
      if (p) {
        setDisplayName(p.displayName ?? "");
        setPhone(p.phone ?? "");
        setLocation(p.location ?? "");
        setBio(p.bio ?? "");
        setProfilePhoto(p.profilePhoto ?? "");
      } else {
        setDisplayName(user.displayName ?? "");
      }
      setLoading(false);
    });
  }, [user?.uid, authLoading]);

  const completeness = (() => {
    const fields = [displayName, phone, location, bio, profilePhoto];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  })();

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const ok = await saveCustomerProfile(user.uid, {
      displayName: displayName.trim(),
      phone: phone.trim() || undefined,
      location: location.trim() || undefined,
      bio: bio.trim() || undefined,
      profilePhoto: profilePhoto || undefined,
    });
    setSaving(false);
    if (ok) toast.success("Profile saved.");
    else toast.error("Save failed. Check your connection and try again.");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            My Profile
          </h1>
          <p className="text-sm text-gray-500">Manage your account details.</p>
        </div>
      </div>

      {!isFirebaseConfigured && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">
            Firebase is not configured. Changes will not be saved.
          </CardContent>
        </Card>
      )}

      {/* Photo + name */}
      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <PhotoAvatar
              photo={profilePhoto}
              name={displayName}
              onUpload={setProfilePhoto}
              size="xl"
            />
            <div className="flex-1 space-y-3 w-full">
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground bg-gray-50 border rounded-md px-3 py-2">
                  {user?.email ?? "—"}
                </p>
              </div>
            </div>
          </div>
          <ProfileProgress pct={completeness} />
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                <Phone className="h-3.5 w-3.5 inline mr-1" />
                Phone
              </Label>
              <Input
                id="phone"
                placeholder="(555) 555-5555"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">
                <MapPin className="h-3.5 w-3.5 inline mr-1" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="City, State"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={80}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">About Me</Label>
            <Textarea
              id="bio"
              placeholder="A short note about yourself (optional)"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/500
            </p>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        className="w-full"
        size="lg"
        disabled={saving || !isFirebaseConfigured}
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
          </>
        ) : (
          "Save Profile"
        )}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export — branches on role
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { role } = useRole();
  if (role === "pro") return <ProProfileEdit />;
  return <CustomerProfileEdit />;
}
