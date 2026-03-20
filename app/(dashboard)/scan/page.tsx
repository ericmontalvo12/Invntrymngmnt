import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { ScanModeClient } from "@/components/scan/ScanModeClient";

export default async function ScanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "viewer") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan Mode"
        description="Fast UPC scanning for high-volume receiving and dispatch"
      />
      <ScanModeClient />
    </div>
  );
}
