import { ArrowRight, ShieldCheck, Siren, Users2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Muted } from "@/components/ui/typography";
import { StatusChip } from "@/components/ui/status-chip";
import Reveal from "@/components/landing/Reveal";
import SectionHeading from "@/components/landing/SectionHeading";

const ROLES = [
  {
    icon: Siren,
    role: "Citizen",
    tagline: "Report in seconds",
    body: "Flag a hazard with a photo, a location pin, and one tap — even on a low-end phone or a spotty connection.",
  },
  {
    icon: Users2,
    role: "Volunteer",
    tagline: "Verify on the ground",
    body: "Field teams get a prioritized, zone-scoped task list and can confirm or escalate reports in real time.",
  },
  {
    icon: ShieldCheck,
    role: "Authority",
    tagline: "Dispatch and track",
    body: "A city-wide command view turns verified reports into dispatched, trackable, auditable responses.",
  },
];

function Solution() {
  return (
    <section className="border-b border-border py-14">
      <div className="container">
        <SectionHeading
          eyebrow="The solution"
          title="One shared operational picture, three roles, zero blind spots."
          subtitle="Guardians of the Slums connects the person who sees the hazard to the person who can fix it — with nothing lost in translation."
        />

        <div className="relative mt-14 grid gap-6 md:grid-cols-3">
          {/* connecting line (desktop only) */}
          <div className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-border-strong to-transparent md:block" />

          {ROLES.map((r, i) => (
            <Reveal key={r.role} delay={i * 0.1} className="relative">
              <div className="mb-4 flex justify-center md:justify-start">
                <div className="relative z-10 flex size-9 items-center justify-center rounded-full border border-border-strong bg-card text-primary">
                  <r.icon className="size-4" />
                </div>
              </div>
              <Card variant={i === 1 ? "highlight" : "default"} className="h-full">
                <CardContent className="p-5">
                  <StatusChip variant="primary" dot={false} className="mb-3">
                    {r.role}
                  </StatusChip>
                  <div className="text-base font-semibold text-foreground">{r.tagline}</div>
                  <Muted className="mt-2">{r.body}</Muted>
                </CardContent>
              </Card>
              {i < ROLES.length - 1 && (
                <ArrowRight className="absolute -right-3 top-8 hidden size-4 text-border-strong md:block" />
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Solution;
