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
  FolderKanban,
  Users,
  Settings,
  QrCode,
  PackageCheck,
  PackageMinus,
  ShoppingCart,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "staff", "viewer"] },
  { href: "/inventory", label: "Inventory", icon: Package, roles: ["admin", "staff", "viewer"] },
  { href: "/reorder", label: "Reorder List", icon: RefreshCw, roles: ["admin", "staff", "viewer"] },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, roles: ["admin", "staff"] },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, roles: ["admin", "staff", "viewer"] },
  { href: "/receiving", label: "Receiving", icon: PackageCheck, roles: ["admin", "staff"] },
  { href: "/dispatch", label: "Dispatch", icon: PackageMinus, roles: ["admin", "staff"] },
  { href: "/scan", label: "Scan Mode", icon: QrCode, roles: ["admin", "staff"] },
  { href: "/vendors", label: "Vendors", icon: Truck, roles: ["admin", "staff", "viewer"] },
  { href: "/categories", label: "Categories", icon: Tag, roles: ["admin", "staff", "viewer"] },
  { href: "/buildings", label: "Buildings", icon: Building2, roles: ["admin", "staff", "viewer"] },
  { href: "/projects", label: "Projects", icon: FolderKanban, roles: ["admin", "staff", "viewer"] },
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
          "fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card shadow-xl transition-transform duration-300 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Vantory</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4">
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
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
