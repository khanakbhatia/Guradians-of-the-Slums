import { useState } from "react";
import { Search } from "lucide-react";

const CATEGORY_LABEL = {
  shelter: "Shelter",
  hospital: "Hospital",
  school: "School",
  incident: "Incident",
};

/**
 * Searches over the markers currently loaded on the map (passed in via
 * `items`) — not a separate data source. Selecting a result pans the
 * map to it and opens the same info panel a click would.
 */
function MapSearch({ items, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = query.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];

  function handleSelect(item) {
    onSelect(item);
    setQuery(item.name);
    setOpen(false);
  }

  return (
    <div className="pointer-events-auto relative w-32 sm:w-52">
      <div className="flex items-center gap-1.5 rounded-sm border border-border-strong bg-popover/95 px-2 py-1.5 shadow-panel backdrop-blur">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Search map…"
          aria-label="Search map markers"
          className="w-full min-w-0 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-sm border border-border-strong bg-popover shadow-panel">
          {results.map((r) => (
            <button
              key={`${r.category}-${r.id}`}
              onMouseDown={() => handleSelect(r)}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-foreground/90 transition-colors hover:bg-accent"
            >
              <span className="truncate">{r.name}</span>
              <span className="ml-auto shrink-0 text-2xs text-muted-foreground">
                {CATEGORY_LABEL[r.category] ?? r.category}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MapSearch;
