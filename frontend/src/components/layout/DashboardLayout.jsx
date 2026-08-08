import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import MobileSidebar from "@/components/layout/MobileSidebar";
import BottomNavigation from "@/components/layout/BottomNavigation";
import FloatingActionButton from "@/components/layout/FloatingActionButton";
import { Navbar } from "@/components/layout/Navbar";
import PageTransition from "@/components/layout/PageTransition";

/**
 * Authenticated app shell — the ONE layout reused by every dashboard
 * page (Authority/Volunteer/Citizen/Admin/Map/Incident/Profile/Settings).
 *
 * Responsive strategy:
 *  - Desktop (lg+): icon-rail Sidebar (collapsible) + Navbar.
 *  - Tablet/Mobile (below lg): Sidebar is hidden; a hamburger in Navbar
 *    opens MobileSidebar (full drawer), and BottomNavigation covers the
 *    top 3 role destinations for one-thumb reach. FloatingActionButton
 *    surfaces the role's primary action above the tab bar.
 *  - Content gets extra bottom padding below lg so the bottom nav / FAB
 *    never overlap page content.
 */
function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 lg:pb-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      <BottomNavigation onOpenMore={() => setMobileNavOpen(true)} />
      <FloatingActionButton />
    </div>
  );
}

export default DashboardLayout;
