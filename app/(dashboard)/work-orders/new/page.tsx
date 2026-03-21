import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { WorkOrderForm } from "@/components/work-orders/WorkOrderForm";

export default async function NewWorkOrderPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "viewer") redirect("/work-orders");

  const [
    { data: buildings },
    { data: inspectionTypes },
    { data: items },
  ] = await Promise.all([
    supabase.from("buildings").select("id, name").order("name"),
    supabase.from("inspection_types").select("id, name").order("name"),
    supabase
      .from("inventory_items")
      .select("id, name, sku")
      .eq("status", "active")
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Work Order"
        description="Fill in the details below"
      />
      <WorkOrderForm
        buildings={buildings ?? []}
        inspectionTypes={inspectionTypes ?? []}
        inventoryItems={items ?? []}
      />
    </div>
  );
}
