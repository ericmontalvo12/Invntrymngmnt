import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { CrudTable } from "@/components/shared/CrudTable";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/categories";

export default async function CategoriesPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: { user } }] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.auth.getUser(),
  ]);

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description={`${categories?.length ?? 0} categories`}
      />
      <CrudTable
        items={categories ?? []}
        label="Category"
        isAdmin={isAdmin}
        onCreate={(data) => createCategory(data)}
        onUpdate={(id, data) => updateCategory(id, data)}
        onDelete={(id) => deleteCategory(id)}
      />
    </div>
  );
}
