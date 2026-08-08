import { Bell, CheckCircle2, Radar, Siren } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DataText, Muted } from "@/components/ui/typography";
import Reveal from "@/components/landing/Reveal";
import SectionHeading from "@/components/landing/SectionHeading";

const STEPS = [
  {
    icon: Siren,
    step: "01",
    title: "Report",
    body: "A resident spots a hazard and submits a report with a photo and location in under 15 seconds.",
  },
  {
    icon: Radar,
    step: "02",
    title: "Triage",
    body: "IBM Watson classifies severity and category, and the report appears on the live zone map instantly.",
  },
  {
    icon: Bell,
    step: "03",
    title: "Dispatch",
    body: "Authorities assign the nearest available volunteer team; everyone involved is notified in real time.",
  },
  {
    icon: CheckCircle2,
    step: "04",
    title: "Resolve",
    body: "The field team confirms resolution on-site, closing the loop with a timestamped, auditable record.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border py-14">
      <div className="container">
        <SectionHeading
          eyebrow="How it works"
          title="From a phone in someone's hand to a team on the ground."
          subtitle="Four steps, typically minutes apart — not the hours a word-of-mouth report takes today."
        />

        <div className="relative mt-14 grid gap-6 lg:grid-cols-4">
          <div className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-border-strong to-transparent lg:block" />

          {STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.1}>
              <div className="relative z-10 mb-4 flex size-9 items-center justify-center rounded-full border border-border-strong bg-card">
                <DataText className="text-primary">{s.step}</DataText>
              </div>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-2 p-4">
                  <div className="flex items-center gap-2">
                    <s.icon className="size-4 text-muted-foreground" />
                    <div className="text-sm font-semibold text-foreground">{s.title}</div>
                  </div>
                  <Muted>{s.body}</Muted>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
