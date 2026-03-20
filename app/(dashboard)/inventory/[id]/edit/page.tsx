import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { ItemForm } from "@/components/inventory/ItemForm";
import type { InventoryItem } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditItemPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect(`/inventory/${id}`);

  const [itemResult, { data: categories }, { data: locations }, { data: suppliers }] =
    await Promise.all([
      supabase
        .from("inventory_items")
        .select("*, category:categories(*), location:locations(*), supplier:suppliers(*)")
        .eq("id", id)
        .single(),
      supabase.from("categories").select("*").order("name"),
      supabase.from("locations").select("*").order("name"),
      supabase.from("suppliers").select("*").order("name"),
    ]);

  if (itemResult.error || !itemResult.data) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Item"
        description={`Editing ${itemResult.data.name}`}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemForm
            item={itemResult.data as InventoryItem}
            categories={categories ?? []}
            locations={locations ?? []}
            suppliers={suppliers ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
