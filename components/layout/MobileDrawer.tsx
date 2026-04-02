"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  RefreshCw,
  ArrowLeftRight,
  Truck,
  Tag,
  Building2,
  ClipboardList,
  Users,
  Settings,
  QrCode,
  ShoppingCart,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import features from "@/lib/features";
import type { UserRole } from "@/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "staff", "viewer"] },
  { href: "/inventory", label: "Inventory", icon: Package, roles: ["admin", "staff", "viewer"] },
  { href: "/reorder", label: "Reorder List", icon: RefreshCw, roles: ["admin", "staff", "viewer"] },
  ...(features.purchaseOrders ? [{ href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, roles: ["admin", "staff"] }] : []),
  ...(features.workOrders ? [{ href: "/work-orders", label: "Work Orders", icon: ClipboardList, roles: ["admin", "staff", "viewer"] }] : []),
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, roles: ["admin", "staff", "viewer"] },
  { href: "/scan", label: "Scan Mode", icon: QrCode, roles: ["admin", "staff"] },
  ...(features.vendors ? [{ href: "/vendors", label: "Vendors", icon: Truck, roles: ["admin", "staff", "viewer"] }] : []),
  { href: "/categories", label: "Categories", icon: Tag, roles: ["admin", "staff", "viewer"] },
  { href: "/buildings", label: "Buildings", icon: Building2, roles: ["admin", "staff", "viewer"] },
  { href: "/users", label: "Users", icon: Users, roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
] as const;

interface MobileDrawerProps {
  role: UserRole;
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ role, open, onClose }: MobileDrawerProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) =>
    (item.roles as readonly string[]).includes(role)
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[80vw] max-w-64 flex-col bg-card shadow-2xl transition-transform duration-300 ease-in-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header — matches TopNav h-14 */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">OpsDesk</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3">
          <ul className="space-y-0.5 px-3">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
