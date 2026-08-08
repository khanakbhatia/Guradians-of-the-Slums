import { useState } from "react";
import { Camera, MapPin, Siren } from "lucide-react";

import { useReportIncident } from "@/hooks/queries/useCitizenQueries";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Fire hazard", "Water contamination", "Structural risk", "Electrical hazard", "Sanitation", "Other"];

function ReportIncidentDialog({ trigger }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const reportIncident = useReportIncident();

  function resetForm() {
    setCategory(CATEGORIES[0]);
    setDescription("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    reportIncident.mutate(
      { category, description },
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
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-md border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                      category === c
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border-strong text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {c}
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
              <Button type="button" variant="outline" size="sm" className="justify-start">
                <MapPin className="size-4" /> Use current location
              </Button>
              <Button type="button" variant="outline" size="sm" className="justify-start">
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
