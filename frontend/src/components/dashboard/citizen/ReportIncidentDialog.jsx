import { useRef, useState } from "react";
import { Camera, MapPin, Siren, X } from "lucide-react";

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

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;

function ReportIncidentDialog({ trigger }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [locating, setLocating] = useState(false);
  const fileInputRef = useRef(null);
  const reportIncident = useReportIncident();

  function resetForm() {
    setCategory(CATEGORIES[0].value);
    setDescription("");
    setLocation(null);
    setPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setPhoto(null);
      return;
    }
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      e.target.value = "";
      setPhoto(null);
      toast({
        variant: "destructive",
        title: "Unsupported photo type",
        description: "Attach a JPEG, PNG, or WebP image.",
      });
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      e.target.value = "";
      setPhoto(null);
      toast({
        variant: "destructive",
        title: "Photo too large",
        description: "Attach an image smaller than 8 MB.",
      });
      return;
    }
    setPhoto(file);
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
      { hazardType: category, description, location, photos: photo ? [photo] : [] },
      {
        onSuccess: () => {
          setOpen(false);
          resetForm();
          toast({
            variant: "success",
            title: "Report submitted",
            description: photo
              ? "Your report and photo evidence were uploaded."
              : "A volunteer will verify this shortly.",
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="size-4" /> {photo ? "Photo attached" : "Attach photo"}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
            {photo && (
              <div className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">{photo.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setPhoto(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  aria-label="Remove attached photo"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )}
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
