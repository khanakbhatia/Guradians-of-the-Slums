import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const SEED_MESSAGES = [
  { id: "m1", author: "Priya Nair", self: false, text: "On-site now, confirming the hazard location.", time: "2:20 PM" },
  { id: "m2", author: "You", self: true, text: "Copy — keep the perimeter clear until the fire team arrives.", time: "2:21 PM" },
];

/**
 * PLACEHOLDER: messages live only in local component state and reset
 * on reload. No messaging backend or real-time transport is connected.
 */
function IncidentChat() {
  const [messages, setMessages] = useState(SEED_MESSAGES);
  const [draft, setDraft] = useState("");

  function handleSend(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, author: "You", self: true, text: draft.trim(), time: "Just now" },
    ]);
    setDraft("");
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Incident chat</CardTitle>
          <CardDescription>Coordinate directly with the assigned team</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-muted-foreground" />
          <StatusChip variant="neutral" dot={false}>Local preview</StatusChip>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 pt-2">
        <div className="max-h-72 flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex flex-col", m.self ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-md px-3 py-2 text-sm",
                  m.self ? "bg-primary/15 text-foreground" : "bg-secondary/60 text-foreground/90"
                )}
              >
                {m.text}
              </div>
              <span className="mt-1 px-1 text-2xs text-muted-foreground">
                {m.self ? "You" : m.author} · {m.time}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border pt-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message the assigned team…"
            aria-label="Message the assigned team"
            className="flex-1 rounded-md border border-border-strong bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:bg-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
          />
          <Button type="submit" size="icon" aria-label="Send message">
            <Send className="size-4" />
          </Button>
        </form>
        <Muted className="text-2xs">
          Messages are stored locally in this session only — not yet connected to a messaging backend.
        </Muted>
      </CardContent>
    </Card>
  );
}

export default IncidentChat;
