import { Quote } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DataText, Eyebrow, Muted } from "@/components/ui/typography";
import Reveal from "@/components/landing/Reveal";
import SectionHeading from "@/components/landing/SectionHeading";
import CountUp from "@/components/landing/CountUp";

const METRICS = [
  { to: 68, suffix: "%", label: "faster time-to-dispatch vs. word-of-mouth reporting" },
  { to: 2340, suffix: "+", label: "active volunteers across pilot zones" },
  { to: 128, suffix: "", label: "settlement zones under live monitoring" },
  { to: 94, suffix: "%", label: "of reports resolved within 24 hours" },
];

/** Composite, illustrative personas — not real named individuals. */
const STORIES = [
  {
    quote:
      "We used to hear about a fire after it had already spread. Now my team gets the exact lane number before we've even left the station.",
    name: "Field Response Coordinator",
    context: "Municipal Authority, pilot zone",
  },
  {
    quote:
      "I reported a broken drain outside my house and had someone on-site the same evening. That never happened before.",
    name: "Community Resident",
    context: "Reporting citizen, pilot zone",
  },
  {
    quote:
      "The app tells me exactly which lanes need a check today instead of me guessing where to walk first.",
    name: "Ground Volunteer",
    context: "Field team, pilot zone",
  },
];

function Impact() {
  return (
    <section className="border-b border-border py-14">
      <div className="container">
        <SectionHeading
          eyebrow="Social impact"
          title="Measured in minutes saved and hazards caught early."
          subtitle="Early pilot numbers from the zones where Guardians of the Slums is already running."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((m, i) => (
            <Reveal key={m.label} delay={i * 0.08}>
              <Card className="h-full">
                <CardContent className="p-5">
                  <DataText className="block text-3xl font-medium text-primary">
                    <CountUp to={m.to} suffix={m.suffix} />
                  </DataText>
                  <Muted className="mt-2">{m.label}</Muted>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {STORIES.map((s, i) => (
            <Reveal key={s.name} delay={0.1 + i * 0.08}>
              <Card variant={i === 1 ? "highlight" : "default"} className="h-full">
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <Quote className="size-5 text-primary/60" />
                  <p className="flex-1 text-sm leading-relaxed text-foreground/90">
                    &ldquo;{s.quote}&rdquo;
                  </p>
                  <div>
                    <div className="text-sm font-medium text-foreground">{s.name}</div>
                    <Eyebrow className="mt-0.5">{s.context}</Eyebrow>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Impact;
