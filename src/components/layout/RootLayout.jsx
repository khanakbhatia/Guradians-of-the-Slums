import { useState } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

/**
 * App shell: icon-rail sidebar + top bar + scrollable content area.
 * Content region carries the faint structural grid used throughout
 * the system as ambient texture behind panels.
 */
function RootLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar breadcrumb={["Guardians"]} title="Overview" />
        <main className="bg-command-grid flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default RootLayout;
