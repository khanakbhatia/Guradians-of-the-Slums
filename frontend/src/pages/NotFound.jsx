import { Link } from "react-router-dom";
import { CompassIcon } from "lucide-react";

import { ROUTES } from "@/constants";
import { Button } from "@/components/ui/button";
import { Eyebrow, H1, Muted } from "@/components/ui/typography";

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-border-strong bg-card text-muted-foreground">
        <CompassIcon className="size-6" />
      </div>
      <Eyebrow>Error 404</Eyebrow>
      <H1 className="text-3xl">This location isn't on the map.</H1>
      <Muted className="max-w-sm">
        The page you're looking for doesn't exist or may have moved.
      </Muted>
      <Button asChild className="mt-2">
        <Link to={ROUTES.HOME}>Return home</Link>
      </Button>
    </div>
  );
}

export default NotFound;
