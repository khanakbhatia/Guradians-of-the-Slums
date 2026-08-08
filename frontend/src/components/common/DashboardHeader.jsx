import { useAuth } from "@/context/AuthContext";
import { firstName } from "@/lib/utils";
import { H2, Muted } from "@/components/ui/typography";

/**
 * Single source of truth for the heading block at the top of every
 * dashboard page. Personalizes with the signed-in user's first name so
 * four dashboards don't drift into four different heading styles.
 */
function DashboardHeader({ subtitle, action }) {
  const { user } = useAuth();

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <H2>Welcome back, {firstName(user?.name)}</H2>
        {subtitle && <Muted className="mt-1">{subtitle}</Muted>}
      </div>
      {action}
    </div>
  );
}

export default DashboardHeader;
