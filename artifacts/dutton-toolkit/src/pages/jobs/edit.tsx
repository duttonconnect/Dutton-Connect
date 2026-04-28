import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Crosshair, Loader2 } from "lucide-react";
import { LocationPicker } from "@/components/location-picker";
import { useState } from "react";

const jobSchema = z.object({
  title: z.string().min(1, "Title is required"),
  customerId: z.string().min(1, "Customer is required"),
  address: z.string().min(1, "Address is required"),
  latitude: z.union([z.coerce.number(), z.literal("")]).optional(),
  longitude: z.union([z.coerce.number(), z.literal("")]).optional(),
  scheduledDate: z.string().min(1, "Date is required"),
  estimatedHours: z.coerce.number().min(0),
  hourlyRate: z.coerce.number().min(0),
  materialsCost: z.coerce.number().min(0),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
});

type JobFormValues = z.infer<typeof jobSchema>;

export default function EditJob() {
  const params = useParams<{ id: string }>();
  const { jobs, customers, updateJob } = useAppStore();
  const [, setLocation] = useLocation();
  const [locating, setLocating] = useState(false);

  const job = jobs.find((j) => j.id === params.id);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: job
      ? {
          title: job.title,
          customerId: job.customerId,
          address: job.address,
          latitude: typeof job.latitude === "number" ? job.latitude : "",
          longitude: typeof job.longitude === "number" ? job.longitude : "",
          scheduledDate: job.scheduledDate ? job.scheduledDate.slice(0, 10) : "",
          estimatedHours: job.estimatedHours,
          hourlyRate: job.hourlyRate,
          materialsCost: job.materialsCost,
          description: job.description ?? "",
          notes: job.notes ?? "",
          status: job.status,
        }
      : undefined,
  });

  if (!job) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Job not found</h1>
        <Link href="/jobs">
          <Button variant="outline">Back to Jobs</Button>
        </Link>
      </div>
    );
  }

  function handleUseMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        form.setValue("latitude", lat, { shouldDirty: true, shouldValidate: true });
        form.setValue("longitude", lng, { shouldDirty: true, shouldValidate: true });
        setLocating(false);
        toast.success("Location captured");
      },
      (err) => {
        setLocating(false);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied"
            : err.code === err.POSITION_UNAVAILABLE
              ? "Location unavailable"
              : err.code === err.TIMEOUT
                ? "Location request timed out"
                : "Could not get location";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  function onSubmit(data: JobFormValues) {
    const lat = data.latitude === "" || data.latitude === undefined ? undefined : Number(data.latitude);
    const lng = data.longitude === "" || data.longitude === undefined ? undefined : Number(data.longitude);
    updateJob(job!.id, {
      title: data.title,
      customerId: data.customerId,
      address: data.address,
      latitude: typeof lat === "number" && !Number.isNaN(lat) ? lat : undefined,
      longitude: typeof lng === "number" && !Number.isNaN(lng) ? lng : undefined,
      scheduledDate: data.scheduledDate,
      estimatedHours: data.estimatedHours,
      hourlyRate: data.hourlyRate,
      materialsCost: data.materialsCost,
      description: data.description || "",
      notes: data.notes || "",
      status: data.status,
    });
    toast.success("Job updated");
    setLocation(`/jobs/${job!.id}`);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Job</h1>
          <p className="text-gray-500">Update details for {job.title}.</p>
        </div>
        <Link href={`/jobs/${job.id}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Deck Repair" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-sm font-medium">Coordinates (optional)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUseMyLocation}
                    disabled={locating}
                  >
                    {locating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Locating...</>
                    ) : (
                      <><Crosshair className="mr-2 h-4 w-4" /> Use My Location</>
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Latitude</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="33.9519"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Longitude</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="-83.3576"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Click on the map below, drag the pin, type values, or use your current location.
                </p>
                {(() => {
                  const latVal = form.watch("latitude");
                  const lngVal = form.watch("longitude");
                  const latNum =
                    typeof latVal === "number"
                      ? latVal
                      : latVal === "" || latVal === undefined
                        ? null
                        : Number(latVal);
                  const lngNum =
                    typeof lngVal === "number"
                      ? lngVal
                      : lngVal === "" || lngVal === undefined
                        ? null
                        : Number(lngVal);
                  return (
                    <LocationPicker
                      lat={latNum != null && !Number.isNaN(latNum) ? latNum : null}
                      lng={lngNum != null && !Number.isNaN(lngNum) ? lngNum : null}
                      onChange={(lat, lng) => {
                        form.setValue("latitude", lat, { shouldDirty: true, shouldValidate: true });
                        form.setValue("longitude", lng, { shouldDirty: true, shouldValidate: true });
                      }}
                    />
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduled Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Est. Hours</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate ($)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="materialsCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Materials Cost ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description / Scope of Work</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Details about the job..." className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notes only visible to your team..." className="min-h-[80px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" className="flex-1">Save Changes</Button>
                <Link href={`/jobs/${job.id}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">Cancel</Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
