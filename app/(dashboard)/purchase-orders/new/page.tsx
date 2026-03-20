import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { POForm } from "@/components/purchase-orders/POForm";

export default async function NewPurchaseOrderPage() {
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

  if (!profile || profile.role === "viewer") redirect("/purchase-orders");

  const [
    { data: vendors },
    { data: projects },
    { data: buildings },
    { data: items },
  ] = await Promise.all([
    supabase.from("suppliers").select("id, name").order("name"),
    supabase.from("projects").select("id, name").order("name"),
    supabase.from("buildings").select("id, name").order("name"),
    supabase
      .from("inventory_items")
      .select("id, name, sku, cost_per_unit")
      .eq("status", "active")
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Order"
        description="Fill in the details and add items"
      />
      <POForm
        vendors={vendors ?? []}
        projects={projects ?? []}
        buildings={buildings ?? []}
        inventoryItems={items ?? []}
      />
    </div>
  );
}
