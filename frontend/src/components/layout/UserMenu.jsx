import { useNavigate } from "react-router-dom";
import { LogOut, Settings, User } from "lucide-react";

import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS, ROUTES } from "@/constants";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/** Self-contained account menu: reads the logged-in user, handles sign-out. */
function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate(ROUTES.LOGIN);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex size-8 items-center justify-center rounded-full bg-primary/15 font-mono text-2xs font-medium text-primary transition-colors hover:bg-primary/25"
          )}
          aria-label="Account menu"
        >
          {initials(user?.name) || <User className="size-4" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {user?.name}
          <div className="mt-0.5 font-sans text-xs normal-case tracking-normal text-foreground/80">
            {ROLE_LABELS[user?.role]}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(ROUTES.PROFILE)}>
          <User className="size-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
          <Settings className="size-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onClick={handleLogout}>
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserMenu;
