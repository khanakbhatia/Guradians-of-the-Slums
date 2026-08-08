import { cn } from "@/lib/utils";
import { Eyebrow, H2, Text } from "@/components/ui/typography";
import Reveal from "@/components/landing/Reveal";

function SectionHeading({ eyebrow, title, subtitle, align = "left", className }) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <Eyebrow className="text-primary">{eyebrow}</Eyebrow>}
      <H2 className="mt-2">{title}</H2>
      {subtitle && <Text className="mt-3 text-muted-foreground">{subtitle}</Text>}
    </Reveal>
  );
}

export default SectionHeading;
