import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { WorkOrderDetailClient } from "@/components/work-orders/WorkOrderDetailClient";
import type { WorkOrder, WorkOrderItem } from "@/types";

export default async function WorkOrderDetailPage({
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

  const [{ data: wo }, { data: items }] = await Promise.all([
    supabase
      .from("work_orders")
      .select(
        "*, building:buildings(id, name, address, description, created_at, updated_at), inspection_type:inspection_types(id, name, created_at), requester:profiles!work_orders_requested_by_fkey(id, full_name, email), assignee:profiles!work_orders_assigned_to_fkey(id, full_name, email), completer:profiles!work_orders_completed_by_fkey(id, full_name, email)"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("work_order_items")
      .select("*")
      .eq("work_order_id", id)
      .order("created_at"),
  ]);

  if (!wo) notFound();

  const fullWO = {
    ...wo,
    items: (items ?? []) as WorkOrderItem[],
  } as WorkOrder & { items: WorkOrderItem[] };

  const isAdmin = profile?.role === "admin";
  const isStaff = profile?.role === "staff";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/work-orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <PageHeader
          title={wo.wo_number}
          description={`Created ${new Date(wo.created_at).toLocaleDateString()}`}
        />
      </div>
      <WorkOrderDetailClient wo={fullWO} isAdmin={isAdmin} isStaff={isStaff} />
    </div>
  );
}
