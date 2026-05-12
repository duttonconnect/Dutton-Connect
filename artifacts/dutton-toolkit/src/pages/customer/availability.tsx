import { useState, useEffect } from "react";
import { ArrowLeft, CalendarCheck, Clock, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { format, isFuture, parseISO } from "date-fns";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AvailabilitySlot } from "@/lib/store";

export default function ProAvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [booked, setBooked] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("dutton_booked_slots") ?? "[]")); }
    catch { return new Set(); }
  });

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const load = async () => {
      try {
        const snap = await getDocs(
          query(collection(db!, "availability"), orderBy("date", "asc"))
        );
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as AvailabilitySlot))
          .filter(s => !s.bookedBy && isFuture(parseISO(s.date + "T" + (s.endTime || "23:59"))));
        setSlots(items);
      } catch {
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleBook = async (slot: AvailabilitySlot) => {
    setBookingId(slot.id);
    await new Promise(r => setTimeout(r, 700));
    const next = new Set(booked);
    next.add(slot.id);
    setBooked(next);
    localStorage.setItem("dutton_booked_slots", JSON.stringify([...next]));
    toast.success(`Booked with ${slot.proName} on ${format(parseISO(slot.date), "MMM d")} at ${slot.startTime}.`);
    setBookingId(null);
  };

  // Group by date
  const grouped = slots.reduce<Record<string, AvailabilitySlot[]>>((acc, s) => {
    acc[s.date] = acc[s.date] ? [...acc[s.date], s] : [s];
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Book a Pro Directly</h1>
          <p className="text-sm text-muted-foreground">
            See open time slots from local pros and book instantly — no waiting for a reply.
          </p>
        </div>
      </div>

      {loading && (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin opacity-30" />
          <p className="text-sm">Loading available slots…</p>
        </div>
      )}

      {!loading && slots.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 py-14 text-center text-muted-foreground">
          <CalendarCheck className="h-9 w-9 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No open slots right now</p>
          <p className="text-xs mt-1 max-w-xs mx-auto">
            Pros publish their availability here. Check back soon, or post a request and let pros come to you.
          </p>
          <Link href="/post-request">
            <Button size="sm" className="mt-4">Post a Request Instead</Button>
          </Link>
        </div>
      )}

      {Object.entries(grouped).map(([date, daySlots]) => (
        <div key={date} className="space-y-3">
          <div className="text-sm font-semibold text-gray-700 border-b pb-2">
            {format(parseISO(date), "EEEE, MMMM d")}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {daySlots.map(slot => {
              const isBooked = booked.has(slot.id);
              return (
                <Card key={slot.id} className={isBooked ? "border-green-200 bg-green-50" : ""}>
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{slot.proName}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          {slot.startTime} – {slot.endTime}
                        </div>
                        {slot.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" /> {slot.location}
                          </div>
                        )}
                        {slot.serviceTypes?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {slot.serviceTypes.map(s => (
                              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        )}
                        {slot.notes && <p className="text-xs text-gray-500 mt-1">{slot.notes}</p>}
                      </div>
                    </div>
                    {isBooked ? (
                      <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                        <CheckCircle2 className="h-4 w-4" /> Booked
                      </div>
                    ) : (
                      <Button size="sm" className="w-full" disabled={bookingId === slot.id} onClick={() => handleBook(slot)}>
                        {bookingId === slot.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CalendarCheck className="mr-2 h-3.5 w-3.5" />}
                        Book this slot
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
