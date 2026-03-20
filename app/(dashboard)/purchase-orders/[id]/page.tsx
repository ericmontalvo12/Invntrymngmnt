import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { PODetailClient } from "@/components/purchase-orders/PODetailClient";
import type { PurchaseOrder, PurchaseOrderItem } from "@/types";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
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

  const [{ data: po }, { data: items }] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select(
        "*, vendor:suppliers(id, name, contact_name, email, phone, address, notes, created_at, updated_at), project:projects(id, name, description, created_at, updated_at), building:buildings(id, name, address, description, created_at, updated_at)"
      )
      .eq("id", params.id)
      .single(),
    supabase
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", params.id)
      .order("created_at"),
  ]);

  if (!po) notFound();

  const fullPO = {
    ...po,
    items: (items ?? []) as PurchaseOrderItem[],
  } as PurchaseOrder & { items: PurchaseOrderItem[] };

  const isAdmin = profile?.role === "admin";
  const isStaff = profile?.role === "staff";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/purchase-orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <PageHeader
          title={po.po_number}
          description={`Created ${new Date(po.created_at).toLocaleDateString()}`}
        />
      </div>
      <PODetailClient po={fullPO} isAdmin={isAdmin} isStaff={isStaff} />
    </div>
  );
}
