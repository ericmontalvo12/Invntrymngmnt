import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { UpcWorkflow } from "@/components/scan/UpcWorkflow";

export default async function ReceivingPage() {
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
        title="Receiving"
        description="Scan or search for items to add received stock"
      />
      <div className="max-w-2xl">
        <UpcWorkflow mode="receive" />
      </div>
    </div>
  );
}
