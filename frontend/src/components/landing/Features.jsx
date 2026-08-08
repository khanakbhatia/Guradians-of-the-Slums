import {
  Languages,
  Map,
  Radar,
  ShieldCheck,
  Siren,
  WifiOff,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Muted } from "@/components/ui/typography";
import Reveal from "@/components/landing/Reveal";
import SectionHeading from "@/components/landing/SectionHeading";

const FEATURES = [
  {
    icon: Siren,
    title: "One-tap incident reporting",
    body: "Photo, geotag, and category in under 15 seconds — designed for low-literacy and low-bandwidth users.",
  },
  {
    icon: Map,
    title: "Live GIS zone mapping",
    body: "Every report plots instantly on a shared map, so responders see exactly where help is needed.",
  },
  {
    icon: Radar,
    title: "AI severity triage",
    body: "IBM Watson models classify urgency in real time, surfacing critical hazards before they escalate.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based dashboards",
    body: "Purpose-built views for authorities, volunteers, and citizens — each sees only what's relevant to them.",
  },
  {
    icon: WifiOff,
    title: "Offline-first sync",
    body: "Reports queue on-device and sync automatically the moment a connection is available.",
  },
  {
    icon: Languages,
    title: "Multi-language support",
    body: "Built for the languages spoken in the communities the platform serves, not just English.",
  },
];

function Features() {
  return (
    <section id="features" className="border-b border-border py-14">
      <div className="container">
        <SectionHeading
          eyebrow="Features"
          title="Everything a response network needs, nothing it doesn't."
          subtitle="Purpose-built for high-density, low-infrastructure environments — not a repurposed enterprise ticketing tool."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08}>
              <Card variant="interactive" className="h-full">
                <CardContent className="flex h-full flex-col gap-2.5 p-4">
                  <f.icon className="size-4 text-muted-foreground" />
                  <div className="text-sm font-semibold text-foreground">{f.title}</div>
                  <Muted>{f.body}</Muted>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
