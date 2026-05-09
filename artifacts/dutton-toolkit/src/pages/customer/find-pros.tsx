import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { calculateDistanceMiles } from "@/lib/distance";
import { matchesKeyword } from "@/lib/search";
import { loadAllPublicProfiles, BUSINESS_CATEGORIES } from "@/lib/business-profile";
import { savePro, unsavePro, loadSavedPros } from "@/lib/saved-pros";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Star,
  Hammer,
  Loader2,
  Search,
  LocateFixed,
  X,
  Filter,
  BadgeCheck,
  Zap,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { sendQuoteRequest } from "@/lib/matching";

type Pro = {
  id: string;
  displayName?: string;
  business: string;
  services: string[];
  location: string;
  serviceRadiusMiles: number;
  phone?: string;
  verifiedPro?: boolean;
  fastResponder?: boolean;
  topRated?: boolean;
  completedJobsCount?: number;
  lat?: number;
  lng?: number;
};

const ALL_CATEGORY = "__all__";

export default function FindNearbyPros() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [pros, setPros] = useState<Pro[]>([]);
  const [loadingPros, setLoadingPros] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  // Save state: proId → savedDoc id (null = not saved)
  const [savedMap, setSavedMap] = useState<Record<string, string | null>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Search / filter state
  const [keywordInput, setKeywordInput] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);
  const [searchInput, setSearchInput] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceMiles, setDistanceMiles] = useState<number>(25);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setLoadingPros(true);
    loadAllPublicProfiles()
      .then((profiles) => {
        // Only include users who have role === "pro"
        const proProfiles = profiles.filter((pp) => pp.role === "pro");
        const mapped: Pro[] = proProfiles.map((pp) => ({
          id: pp.proId,
          displayName: pp.displayName,
          business: pp.businessName,
          services: pp.services,
          location: pp.serviceArea,
          serviceRadiusMiles: pp.serviceRadiusMiles,
          phone: pp.publicPhone,
          verifiedPro: pp.verifiedPro,
          fastResponder: pp.fastResponder,
          topRated: pp.topRated,
          completedJobsCount: pp.completedJobsCount,
        }));
        setPros(mapped);
        return mapped;
      })
      .then(async (mapped) => {
        if (!user) return;
        // Pre-load save status for all pros in one batch
        const saved = await loadSavedPros(user.uid);
        const map: Record<string, string | null> = {};
        for (const p of mapped) {
          const entry = saved.find((s) => s.proId === p.id);
          map[p.id] = entry?.id ?? null;
        }
        setSavedMap(map);
      })
      .finally(() => setLoadingPros(false));
  }, [user?.uid]);

  const handleKeywordSearch = () => {
    setAppliedKeyword(keywordInput.trim());
  };

  const handleClearKeyword = () => {
    setKeywordInput("");
    setAppliedKeyword("");
  };

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    setSelectedLocation(trimmed);
  };

  const handleClearLocation = () => {
    setSelectedLocation("");
    setSearchInput("");
    setUserCoords(null);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } },
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            "Current Location";
          const state = data.address?.state_code ?? "";
          const label = state ? `${city}, ${state}` : city;
          setSearchInput(label);
          setSelectedLocation(label);
        } catch {
          setSearchInput("Current Location");
          setSelectedLocation("Current Location");
        } finally {
          setLocating(false);
        }
      },
      () => {
        toast.error("Could not get your location. Please enter it manually.");
        setLocating(false);
      },
    );
  };

  const filteredPros = useMemo(() => {
    return pros.filter((p) => {
      // Category filter
      if (selectedCategory !== ALL_CATEGORY) {
        const cat = selectedCategory.toLowerCase();
        if (!p.services.some((s) => s.toLowerCase().includes(cat))) return false;
      }

      // Keyword filter
      if (
        appliedKeyword &&
        !matchesKeyword(appliedKeyword, [p.business, ...(p.displayName ? [p.displayName] : []), ...p.services, p.location])
      ) {
        return false;
      }

      // Location / distance filter
      if (userCoords && p.lat != null && p.lng != null) {
        const d = calculateDistanceMiles(userCoords.lat, userCoords.lng, p.lat, p.lng);
        return d <= distanceMiles;
      }
      if (selectedLocation) {
        return (
          p.location.toLowerCase().includes(selectedLocation.toLowerCase()) ||
          p.services.some((s) => s.toLowerCase().includes(selectedLocation.toLowerCase()))
        );
      }
      return true;
    });
  }, [pros, userCoords, distanceMiles, selectedLocation, appliedKeyword, selectedCategory]);

  const handleRequestQuote = async (pro: Pro) => {
    if (!user) {
      navigate("/login");
      return;
    }

    setRequestingId(pro.id);
    try {
      const docId = await sendQuoteRequest({
        proId: pro.id,
        customerId: user.uid,
        service: pro.services[0] ?? "General",
        message: "Requesting quote",
      });

      if (docId) {
        setSentIds((prev) => new Set(prev).add(pro.id));
        toast.success("Quote request sent");
        navigate("/messages");
      } else {
        toast.error("Could not send request. Check your connection and try again.");
      }
    } catch (err) {
      console.error("[FindPros] handleRequestQuote error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setRequestingId(null);
    }
  };

  const handleToggleSave = async (pro: Pro) => {
    if (!user) { navigate("/login"); return; }
    setSavingId(pro.id);
    try {
      const currentSavedId = savedMap[pro.id] ?? null;
      if (currentSavedId) {
        await unsavePro(currentSavedId);
        setSavedMap((prev) => ({ ...prev, [pro.id]: null }));
        toast.success("Removed from saved pros");
      } else {
        const newId = await savePro({
          customerId: user.uid,
          proId: pro.id,
          businessName: pro.business,
          services: pro.services,
        });
        if (newId) {
          setSavedMap((prev) => ({ ...prev, [pro.id]: newId }));
          toast.success("Pro saved");
        } else {
          toast.error("Could not save pro. Try again.");
        }
      }
    } catch {
      toast.error("Could not update saved pros. Try again.");
    } finally {
      setSavingId(null);
    }
  };

  const activeFilterCount =
    (appliedKeyword ? 1 : 0) +
    (selectedCategory !== ALL_CATEGORY ? 1 : 0) +
    (selectedLocation ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Find a Pro
          </h1>
          <p className="text-gray-500 text-sm">
            Browse trusted local professionals and request a quote.
          </p>
        </div>
      </div>

      {/* Keyword search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 pr-9"
            placeholder="Search by name, keyword, or location"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleKeywordSearch()}
          />
          {keywordInput && (
            <button
              onClick={handleClearKeyword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear keyword"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={handleKeywordSearch}>
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </div>

      {/* Category + location row */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Service category filter */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-52">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORY}>All categories</SelectItem>
            {BUSINESS_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Location search */}
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 pr-9"
            placeholder="Enter city or zip code"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          {searchInput && (
            <button
              onClick={handleClearLocation}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Distance dropdown — only relevant when using location */}
        <Select
          value={String(distanceMiles)}
          onValueChange={(v) => setDistanceMiles(Number(v))}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 25, 50].map((d) => (
              <SelectItem key={d} value={String(d)}>
                Within {d} miles
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleSearch} disabled={!searchInput.trim()}>
          <Search className="mr-2 h-4 w-4" /> Go
        </Button>
        <Button variant="outline" onClick={handleUseMyLocation} disabled={locating}>
          {locating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="mr-2 h-4 w-4" />
          )}
          My location
        </Button>
      </div>

      {/* Active filters summary */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          Showing{" "}
          <span className="font-semibold text-gray-900">{filteredPros.length}</span>{" "}
          {filteredPros.length === 1 ? "pro" : "pros"}
          {appliedKeyword && (
            <> matching <span className="font-medium text-gray-700">"{appliedKeyword}"</span></>
          )}
        </span>

        {selectedCategory !== ALL_CATEGORY && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-700">
            {selectedCategory}
            <button onClick={() => setSelectedCategory(ALL_CATEGORY)} aria-label="Remove category filter">
              <X className="h-3 w-3 ml-0.5" />
            </button>
          </span>
        )}

        {appliedKeyword && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700">
            "{appliedKeyword}"
            <button onClick={handleClearKeyword} aria-label="Remove keyword filter">
              <X className="h-3 w-3 ml-0.5" />
            </button>
          </span>
        )}

        {activeFilterCount > 1 && (
          <button
            className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
            onClick={() => {
              handleClearKeyword();
              setSelectedCategory(ALL_CATEGORY);
              handleClearLocation();
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active location banner */}
      {selectedLocation && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-4 py-2.5 text-sm text-blue-800">
          <span>
            {userCoords ? (
              <>
                Showing{" "}
                <span className="font-semibold">{filteredPros.length}</span>{" "}
                {filteredPros.length === 1 ? "pro" : "pros"} within{" "}
                <span className="font-semibold">{distanceMiles} miles</span> of{" "}
                <span className="font-semibold">{selectedLocation}</span>
              </>
            ) : (
              <>
                Showing pros near{" "}
                <span className="font-semibold">{selectedLocation}</span>
                {" "}— {filteredPros.length} {filteredPros.length === 1 ? "pro" : "pros"} found
              </>
            )}
          </span>
          <button
            onClick={handleClearLocation}
            className="ml-3 text-blue-500 hover:text-blue-700 shrink-0"
            aria-label="Clear location"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loadingPros ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 mx-auto mb-3 opacity-30 animate-spin" />
          <p className="text-sm">Loading pros in your area…</p>
        </div>
      ) : filteredPros.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-muted-foreground">
          <MapPin className="h-9 w-9 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {selectedLocation
              ? `No pros found near "${selectedLocation}"`
              : selectedCategory !== ALL_CATEGORY
              ? `No pros found for "${selectedCategory}"`
              : "No pros available yet in your area."}
          </p>
          <p className="text-xs mt-1">
            {selectedLocation
              ? "Try a nearby city or a broader search term."
              : selectedCategory !== ALL_CATEGORY
              ? "Try a different category or remove the filter."
              : "Check back soon as more pros join the platform."}
          </p>
          <div className="flex justify-center gap-2 mt-3 flex-wrap">
            {selectedLocation && (
              <Button variant="ghost" size="sm" onClick={handleClearLocation}>
                Clear location
              </Button>
            )}
            {selectedCategory !== ALL_CATEGORY && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(ALL_CATEGORY)}>
                Clear category
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPros.map((pro) => {
            const isSaved = !!savedMap[pro.id];
            const isSaving = savingId === pro.id;
            return (
              <Card key={pro.id} className="flex flex-col group hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col gap-3 flex-1">
                  {/* Header row: avatar + name + save button */}
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/pros/${pro.id}`} className="flex gap-3 min-w-0 flex-1">
                      <div className="h-12 w-12 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                        <Hammer className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-lg flex items-center gap-1.5 group-hover:text-primary transition-colors">
                          <span className="truncate" title={pro.business}>
                            {pro.business}
                          </span>
                          {pro.verifiedPro && (
                            <BadgeCheck
                              className="h-4 w-4 text-primary shrink-0"
                              aria-label="Verified Pro"
                            />
                          )}
                          {pro.topRated && (
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" aria-label="Top Rated" />
                          )}
                        </div>
                        {pro.displayName && pro.displayName !== pro.business && (
                          <p className="text-xs text-muted-foreground truncate">{pro.displayName}</p>
                        )}
                        {(pro.completedJobsCount ?? 0) > 0 && (
                          <p className="text-xs text-muted-foreground">{pro.completedJobsCount} jobs completed</p>
                        )}
                        {/* Trust badge pills */}
                        {(pro.verifiedPro || pro.fastResponder) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {pro.verifiedPro && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                <BadgeCheck className="h-2.5 w-2.5" /> Verified
                              </span>
                            )}
                            {pro.fastResponder && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                                <Zap className="h-2.5 w-2.5" /> Fast Responder
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Save / bookmark button */}
                    <button
                      onClick={() => handleToggleSave(pro)}
                      disabled={isSaving}
                      aria-label={isSaved ? "Remove from saved" : "Save pro"}
                      className={`shrink-0 p-1.5 rounded-md transition-colors ${
                        isSaved
                          ? "text-primary hover:text-primary/70"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSaved ? (
                        <BookmarkCheck className="h-5 w-5" />
                      ) : (
                        <Bookmark className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Service badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {pro.services.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>

                  {/* Location + phone */}
                  <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {pro.location} · serves {pro.serviceRadiusMiles} mi radius
                      </span>
                    </div>
                    {pro.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <a
                          href={`tel:${pro.phone.replace(/[^0-9]/g, "")}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {pro.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-3 border-t">
                    <Link href={`/pros/${pro.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Profile <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      className="flex-1"
                      disabled={requestingId === pro.id || sentIds.has(pro.id)}
                      onClick={() => handleRequestQuote(pro)}
                    >
                      {requestingId === pro.id ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                      ) : sentIds.has(pro.id) ? (
                        "Request Sent"
                      ) : (
                        "Request Quote"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="text-center">
        <Link href="/post-request">
          <Button variant="outline">
            Don't see what you need? Post a job
          </Button>
        </Link>
      </div>
    </div>
  );
}
