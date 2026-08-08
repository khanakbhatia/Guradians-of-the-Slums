import { useState } from "react";
import { Camera, MapPin, Siren } from "lucide-react";

import { useReportIncident } from "@/hooks/queries/useCitizenQueries";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Labels shown to the user, mapped to the backend's hazardType enum
// (flood, fire, structural, landslide, blocked_drainage, other) — the UI
// copy doesn't need to match the API's vocabulary 1:1.
const CATEGORIES = [
  { label: "Fire hazard", value: "fire" },
  { label: "Flooding", value: "flood" },
  { label: "Structural risk", value: "structural" },
  { label: "Landslide", value: "landslide" },
  { label: "Blocked drainage", value: "blocked_drainage" },
  { label: "Other", value: "other" },
];

function ReportIncidentDialog({ trigger }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const reportIncident = useReportIncident();

  function resetForm() {
    setCategory(CATEGORIES[0].value);
    setDescription("");
    setLocation(null);
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Location unavailable", description: "This browser doesn't support geolocation." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          type: "Point",
          coordinates: [pos.coords.longitude, pos.coords.latitude],
        });
        setLocating(false);
      },
      (err) => {
        toast({ variant: "destructive", title: "Couldn't get location", description: err.message });
        setLocating(false);
      }
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    // location is required by the API — bail out with a clear message
    // instead of sending a request guaranteed to fail validation.
    if (!location) {
      toast({ variant: "destructive", title: "Location needed", description: "Tap \u201cUse current location\u201d first." });
      return;
    }
    reportIncident.mutate(
      { hazardType: category, description, location },
      {
        onSuccess: () => {
          setOpen(false);
          resetForm();
          toast({
            variant: "success",
            title: "Report submitted",
            description: "A volunteer will verify this shortly.",
          });
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Couldn't submit report",
            description: err?.message,
          });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg">
            <Siren className="size-4" /> Report an issue
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md p-0">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-border p-5">
            <DialogTitle>Report an incident</DialogTitle>
            <DialogDescription className="mt-1">
              Give responders what they need to act fast.
            </DialogDescription>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <Label>Category</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={cn(
                      "rounded-md border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                      category === c.value
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border-strong text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="description">What's happening?</Label>
              <textarea
                id="description"
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what you're seeing…"
                className="flex w-full rounded-md border border-border-strong bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-primary/60 focus-visible:bg-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" size="sm" className="justify-start" onClick={handleUseCurrentLocation} loading={locating}>
                <MapPin className="size-4" /> {location ? "Location set" : "Use current location"}
              </Button>
              <Button type="button" variant="outline" size="sm" className="justify-start" disabled>
                <Camera className="size-4" /> Attach photo
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border p-4">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" loading={reportIncident.isPending}>
              Submit report
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ReportIncidentDialog;
