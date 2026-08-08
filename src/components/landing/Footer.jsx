import { Link } from "react-router-dom";
import { Globe, Mail, MessageCircle, ShieldHalf } from "lucide-react";

import { ROUTES } from "@/constants";
import { Eyebrow } from "@/components/ui/typography";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Architecture", href: "#architecture" },
  ],
  Roles: [
    { label: "For authorities", href: ROUTES.REGISTER },
    { label: "For volunteers", href: ROUTES.REGISTER },
    { label: "For citizens", href: ROUTES.REGISTER },
  ],
  Company: [
    { label: "Sign in", href: ROUTES.LOGIN },
    { label: "Register", href: ROUTES.REGISTER },
  ],
};

function Footer() {
  return (
    <footer className="bg-canvas">
      <div className="container py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-sm bg-primary/15 text-primary">
                <ShieldHalf className="size-4" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Guardians of the Slums
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              A shared operational picture for informal settlement safety — built for the IBM
              Hackathon.
            </p>
            <div className="mt-5 flex items-center gap-3 text-muted-foreground">
              <a href="#" aria-label="Project website" className="transition-colors hover:text-foreground">
                <Globe className="size-4" />
              </a>
              <a href="#" aria-label="Community forum" className="transition-colors hover:text-foreground">
                <MessageCircle className="size-4" />
              </a>
              <a href="mailto:team@guardiansoftheslums.dev" aria-label="Email" className="transition-colors hover:text-foreground">
                <Mail className="size-4" />
              </a>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <Eyebrow>{section}</Eyebrow>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("#") ? (
                      <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Guardians of the Slums. All rights reserved.</span>
          <span className="font-mono text-2xs">Built for the IBM Hackathon — frontend demo, no backend attached.</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
