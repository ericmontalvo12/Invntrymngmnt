import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import type { Profile } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?error=session");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login?error=session");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar role={profile.role} />
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopNav profile={profile as Profile} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
