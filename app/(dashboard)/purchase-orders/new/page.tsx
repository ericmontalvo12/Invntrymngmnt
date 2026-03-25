import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { POForm } from "@/components/purchase-orders/POForm";

interface PageProps {
  searchParams: Promise<{ item_id?: string; qty?: string }>;
}

export default async function NewPurchaseOrderPage({ searchParams }: PageProps) {
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

  const params = await searchParams;

  const [
    { data: vendors },
    { data: buildings },
    { data: items },
  ] = await Promise.all([
    supabase.from("suppliers").select("id, name").order("name"),
    supabase.from("buildings").select("id, name").order("name"),
    supabase
      .from("inventory_items")
      .select("id, name, sku, upc, cost_per_unit")
      .eq("status", "active")
      .order("name"),
  ]);

  let initialItem: { id: string; name: string; sku: string; cost_per_unit: number | null; quantity: number } | undefined;
  if (params.item_id) {
    const found = (items ?? []).find((i) => i.id === params.item_id);
    if (found) {
      initialItem = {
        id: found.id,
        name: found.name,
        sku: found.sku,
        cost_per_unit: found.cost_per_unit,
        quantity: params.qty ? Math.max(1, parseInt(params.qty, 10) || 1) : 1,
      };
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Order"
        description="Fill in the details and add items"
      />
      <POForm
        vendors={vendors ?? []}
        buildings={buildings ?? []}
        inventoryItems={items ?? []}
        initialItem={initialItem}
      />
    </div>
  );
}
