import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { POForm } from "@/components/purchase-orders/POForm";
import type { PurchaseOrder, PurchaseOrderItem } from "@/types";

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  if (!profile || profile.role === "viewer")
    redirect(`/purchase-orders/${id}`);

  const [{ data: po }, { data: items }] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", id)
      .order("created_at"),
  ]);

  if (!po) notFound();
  if (po.status !== "draft") redirect(`/purchase-orders/${id}`);

  const [
    { data: vendors },
    { data: buildings },
    { data: inventoryItems },
  ] = await Promise.all([
    supabase.from("suppliers").select("id, name").order("name"),
    supabase.from("buildings").select("id, name").order("name"),
    supabase
      .from("inventory_items")
      .select("id, name, sku, cost_per_unit")
      .eq("status", "active")
      .order("name"),
  ]);

  const fullPO = {
    ...po,
    items: (items ?? []) as PurchaseOrderItem[],
  } as PurchaseOrder & { items: PurchaseOrderItem[] };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/purchase-orders/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <PageHeader title={`Edit ${po.po_number}`} />
      </div>
      <POForm
        vendors={vendors ?? []}
        buildings={buildings ?? []}
        inventoryItems={inventoryItems ?? []}
        defaultValues={fullPO}
        mode="edit"
      />
    </div>
  );
}
