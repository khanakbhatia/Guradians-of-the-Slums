import { motion } from "framer-motion";
import { Cloud, Cpu, Database, Layers, Radio, Smartphone } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Eyebrow, Muted } from "@/components/ui/typography";
import Reveal from "@/components/landing/Reveal";
import SectionHeading from "@/components/landing/SectionHeading";

const TIERS = [
  {
    icon: Smartphone,
    label: "Client Layer",
    detail: "React + PWA — offline-first reporting for citizens, volunteers, and authorities",
  },
  {
    icon: Layers,
    label: "API & Integration Layer",
    detail: "REST/GraphQL gateway, auth, and event routing between clients and services",
  },
  {
    icon: Cpu,
    label: "Intelligence Layer",
    detail: "IBM Watson NLP + classification models score severity and route incidents",
  },
  {
    icon: Database,
    label: "Data Layer",
    detail: "IBM Db2 for structured records, Cloud Object Storage for media evidence",
  },
  {
    icon: Radio,
    label: "Notification Layer",
    detail: "Push, SMS, and in-app alerts fan out to the right responders instantly",
  },
];

const lineVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: { pathLength: 1, opacity: 1, transition: { duration: 0.9, ease: "easeInOut" } },
};

function Architecture() {
  return (
    <section id="architecture" className="border-b border-border py-14">
      <div className="container">
        <SectionHeading
          eyebrow="Architecture"
          title="A layered system, built to stay online where connectivity doesn't."
          subtitle="Every layer degrades gracefully — reports queue locally and sync the moment a device reconnects."
        />

        <div className="relative mt-14 mx-auto max-w-md">
          {/* animated connecting spine */}
          <svg
            className="pointer-events-none absolute left-1/2 top-0 h-full w-4 -translate-x-1/2"
            viewBox="0 0 4 100"
            preserveAspectRatio="none"
            fill="none"
          >
            <motion.line
              x1="2" y1="0" x2="2" y2="100"
              stroke="hsl(var(--border-strong))"
              strokeWidth="1"
              strokeDasharray="4 4"
              variants={lineVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            />
          </svg>

          <div className="relative space-y-4">
            {TIERS.map((tier, i) => (
              <Reveal key={tier.label} delay={i * 0.1}>
                <Card variant={i === 2 ? "highlight" : "default"} className="relative">
                  <div className="flex items-center gap-3 p-3.5">
                    <tier.icon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <Eyebrow className="text-foreground/90">{tier.label}</Eyebrow>
                      <Muted className="mt-0.5">{tier.detail}</Muted>
                    </div>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.2}>
          <div className="mx-auto mt-10 flex max-w-md items-center gap-3 rounded-md border border-dashed border-border-strong bg-secondary/30 p-4">
            <Cloud className="size-4 shrink-0 text-muted-foreground" />
            <Muted>
              Deployed on IBM Cloud — every layer scales independently and stays within data
              residency requirements for municipal partners.
            </Muted>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default Architecture;
