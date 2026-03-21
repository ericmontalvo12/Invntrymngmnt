import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { WorkOrderForm } from "@/components/work-orders/WorkOrderForm";
import type { WorkOrder, WorkOrderItem } from "@/types";

export default async function EditWorkOrderPage({
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
    redirect(`/work-orders/${id}`);

  const [{ data: wo }, { data: items }] = await Promise.all([
    supabase.from("work_orders").select("*").eq("id", id).single(),
    supabase
      .from("work_order_items")
      .select("*")
      .eq("work_order_id", id)
      .order("created_at"),
  ]);

  if (!wo) notFound();
  if (wo.status === "completed" || wo.status === "cancelled")
    redirect(`/work-orders/${id}`);

  const [
    { data: buildings },
    { data: inspectionTypes },
    { data: profiles },
    { data: inventoryItems },
  ] = await Promise.all([
    supabase.from("buildings").select("id, name").order("name"),
    supabase.from("inspection_types").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
    supabase
      .from("inventory_items")
      .select("id, name, sku")
      .eq("status", "active")
      .order("name"),
  ]);

  const fullWO = {
    ...wo,
    items: (items ?? []) as WorkOrderItem[],
  } as WorkOrder & { items: WorkOrderItem[] };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/work-orders/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <PageHeader title={`Edit ${wo.wo_number}`} />
      </div>
      <WorkOrderForm
        buildings={buildings ?? []}
        inspectionTypes={inspectionTypes ?? []}
        profiles={profiles ?? []}
        inventoryItems={inventoryItems ?? []}
        defaultValues={fullWO}
        mode="edit"
      />
    </div>
  );
}
