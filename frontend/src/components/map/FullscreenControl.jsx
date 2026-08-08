import { useEffect, useState } from "react";
import { Maximize, Minimize } from "lucide-react";

/** Toggles native fullscreen on the given wrapper ref. No plugin dependency. */
function FullscreenControl({ targetRef }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(document.fullscreenElement === targetRef.current);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [targetRef]);

  function toggle() {
    if (!targetRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      targetRef.current.requestFullscreen?.();
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      className="flex size-7 items-center justify-center rounded-sm border border-border-strong bg-popover/95 text-foreground shadow-panel backdrop-blur transition-colors hover:bg-accent"
    >
      {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
    </button>
  );
}

export default FullscreenControl;
