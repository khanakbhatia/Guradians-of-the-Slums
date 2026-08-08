import { useState } from "react";
import { Moon, Sun, Bell, Shield, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeProvider";
import { ROUTES } from "@/constants";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { H2, Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

function ToggleRow({ icon: Icon, label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-background shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);

  async function handleLogout() {
    await logout();
    navigate(ROUTES.LOGIN);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <H2>Settings</H2>
        <Muted>Preferences are stored locally on this device.</Muted>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Product default is the dark Command theme</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border pt-2">
          <ToggleRow
            icon={theme === "dark" ? Moon : Sun}
            label="Dark theme"
            description="Toggle between dark and light surfaces"
            checked={theme === "dark"}
            onChange={toggleTheme}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Control what alerts you receive</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border pt-2">
          <ToggleRow
            icon={Bell}
            label="Push notifications"
            description="Zone alerts and task updates"
            checked={notifications}
            onChange={setNotifications}
          />
          <ToggleRow
            icon={Shield}
            label="Critical alerts only"
            description="Suppress low-severity notifications"
            checked={criticalOnly}
            onChange={setCriticalOnly}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>End your current session on this device</CardDescription>
        </CardHeader>
        <CardFooter className="justify-start pt-4">
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default Settings;
