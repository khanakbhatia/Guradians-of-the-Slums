import { useState } from "react";
import { ImageOff, Images } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Muted } from "@/components/ui/typography";

function ImageThumb({ image, onClick }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <button
        onClick={onClick}
        className="flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-md border border-border bg-muted text-muted-foreground"
      >
        <ImageOff className="size-5" />
        <span className="text-2xs">Image unavailable</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group relative aspect-video w-full overflow-hidden rounded-md border border-border"
    >
      <img
        src={image.url}
        alt={image.caption}
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <span className="text-2xs text-white/90">{image.caption}</span>
      </div>
    </button>
  );
}

/** Evidence gallery. Illustrative placeholder images — no upload/storage backend. */
function IncidentImages({ images, className }) {
  const [active, setActive] = useState(null);

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Evidence photos</CardTitle>
          <CardDescription>{images.length} attached to this report</CardDescription>
        </div>
        <Images className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <Muted>No photos attached to this report.</Muted>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img) => (
              <ImageThumb key={img.id} image={img} onClick={() => setActive(img)} />
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-2xl p-0">
          <DialogTitle className="sr-only">{active?.caption}</DialogTitle>
          {active && (
            <>
              <img src={active.url} alt={active.caption} className="w-full rounded-t-lg" />
              <div className="p-4">
                <Muted>{active.caption}</Muted>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default IncidentImages;
