import { Brain, Cloud, Database, MessageSquareText, ShieldCheck, Workflow } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DataText, Muted } from "@/components/ui/typography";
import Reveal from "@/components/landing/Reveal";
import SectionHeading from "@/components/landing/SectionHeading";

const STACK = [
  {
    icon: Brain,
    name: "IBM Watson NLP",
    role: "Severity classification",
    body: "Parses free-text and voice reports to extract hazard type, urgency, and location cues.",
  },
  {
    icon: Cloud,
    name: "IBM Cloud",
    role: "Hosting & scaling",
    body: "Runs the API and intelligence layers with regional data residency for municipal partners.",
  },
  {
    icon: Database,
    name: "IBM Db2",
    role: "Structured records",
    body: "Stores incidents, zones, and response history with full audit trails.",
  },
  {
    icon: Workflow,
    name: "IBM Cloud Object Storage",
    role: "Evidence storage",
    body: "Holds photo and media evidence attached to every report, versioned and access-controlled.",
  },
  {
    icon: MessageSquareText,
    name: "Watson Assistant",
    role: "Guided reporting",
    body: "A conversational flow helps residents file a complete report even with minimal typing.",
  },
  {
    icon: ShieldCheck,
    name: "IBM Cloud IAM",
    role: "Access control",
    body: "Role-based permissions ensure authorities, volunteers, and citizens only see what they should.",
  },
];

function TechStack() {
  return (
    <section className="border-b border-border py-14">
      <div className="container">
        <SectionHeading
          eyebrow="IBM technologies"
          title="Built on the IBM stack, end to end."
          subtitle="Every layer of the platform — intelligence, storage, and access control — runs on IBM Cloud services."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map((s, i) => (
            <Reveal key={s.name} delay={(i % 3) * 0.08}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-2.5 p-4">
                  <div className="flex items-center justify-between">
                    <s.icon className="size-4 text-muted-foreground" />
                    <DataText className="text-2xs text-muted-foreground">{s.role}</DataText>
                  </div>
                  <div className="text-sm font-semibold text-foreground">{s.name}</div>
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

export default TechStack;
