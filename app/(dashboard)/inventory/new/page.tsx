import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { ItemForm } from "@/components/inventory/ItemForm";

export default async function NewItemPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/inventory");

  const [{ data: categories }, { data: buildings }, { data: suppliers }] =
    await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("buildings").select("*").order("name"),
      supabase.from("suppliers").select("*").order("name"),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Add Inventory Item" description="Create a new item in your inventory" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemForm
            categories={categories ?? []}
            buildings={buildings ?? []}
            suppliers={suppliers ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
