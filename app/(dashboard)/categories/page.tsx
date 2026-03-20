"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/categories";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/hooks/useToast";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [
        { data: cats },
        {
          data: { user },
        },
      ] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.auth.getUser(),
      ]);
      setCategories((cats ?? []) as Category[]);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setIsAdmin(profile?.role === "admin");
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Categories" description={`${categories.length} categories`}>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Category</DialogTitle>
              </DialogHeader>
              <CategoryForm
                onSubmit={async (data) => {
                  const result = await createCategory(data);
                  if (!result.success) {
                    toast({ title: "Error", description: result.error, variant: "destructive" });
                    return;
                  }
                  setCategories((prev) =>
                    [...prev, result.data as Category].sort((a, b) =>
                      a.name.localeCompare(b.name)
                    )
                  );
                  toast({ title: "Category created" });
                  setCreateOpen(false);
                }}
                onCancel={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Add your first category to get started."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground">
                      {c.description ?? "—"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog
                            open={editItem?.id === c.id}
                            onOpenChange={(o) => {
                              if (!o) setEditItem(null);
                              else setEditItem(c);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Category</DialogTitle>
                              </DialogHeader>
                              <CategoryForm
                                defaultValues={c}
                                onSubmit={async (data) => {
                                  const result = await updateCategory(c.id, data);
                                  if (!result.success) {
                                    toast({ title: "Error", description: result.error, variant: "destructive" });
                                    return;
                                  }
                                  setCategories((prev) =>
                                    prev.map((x) =>
                                      x.id === c.id ? (result.data as Category) : x
                                    )
                                  );
                                  toast({ title: "Category updated" });
                                  setEditItem(null);
                                }}
                                onCancel={() => setEditItem(null)}
                              />
                            </DialogContent>
                          </Dialog>
                          <ConfirmDialog
                            trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            }
                            title="Delete Category?"
                            description={`Delete "${c.name}"? Items in this category will have it removed.`}
                            confirmLabel="Delete"
                            onConfirm={async () => {
                              const result = await deleteCategory(c.id);
                              if (!result.success) {
                                toast({ title: "Error", description: result.error, variant: "destructive" });
                                return;
                              }
                              setCategories((prev) => prev.filter((x) => x.id !== c.id));
                              toast({ title: "Category deleted" });
                            }}
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CategoryForm({
  defaultValues,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Category;
  onSubmit: (data: Omit<Category, "id" | "created_at" | "updated_at">) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: defaultValues?.name ?? "",
    description: defaultValues?.description ?? "",
  });
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      name: form.name,
      description: form.description || null,
    });
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Category"}
        </Button>
      </DialogFooter>
    </form>
  );
}
