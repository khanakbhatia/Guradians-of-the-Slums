import { Flame, HeartPulse, PhoneOff, TriangleAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DataText, Muted } from "@/components/ui/typography";
import Reveal from "@/components/landing/Reveal";
import SectionHeading from "@/components/landing/SectionHeading";

const PROBLEMS = [
  {
    icon: PhoneOff,
    stat: "42%",
    label: "of hazards go unreported",
    body: "No single, trusted channel for residents to flag fires, contamination, or structural risk before they escalate.",
  },
  {
    icon: TriangleAlert,
    stat: "3–6 hrs",
    label: "average response delay",
    body: "Reports travel through informal word-of-mouth chains before ever reaching an authority who can act.",
  },
  {
    icon: Flame,
    stat: "1 in 5",
    label: "fires spread before response",
    body: "Dense, unmapped settlements make it hard for emergency teams to locate and reach the exact point of risk.",
  },
  {
    icon: HeartPulse,
    stat: "60M+",
    label: "residents in high-risk settlements",
    body: "Across major cities, informal settlements remain the least instrumented, least monitored part of urban infrastructure.",
  },
];

function Problem() {
  return (
    <section className="border-b border-border py-14">
      <div className="container">
        <SectionHeading
          eyebrow="The problem"
          title="Slum safety runs on word of mouth, not data."
          subtitle="Millions of residents live without a reliable way to report hazards — and the teams meant to protect them have no shared picture of where help is needed most."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.label} delay={i * 0.06}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-2 p-4">
                  <div className="flex items-center gap-2">
                    <p.icon className="size-4 text-destructive" />
                    <DataText className="text-xl font-medium text-foreground">{p.stat}</DataText>
                  </div>
                  <div className="text-sm font-medium text-foreground">{p.label}</div>
                  <Muted>{p.body}</Muted>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Problem;
