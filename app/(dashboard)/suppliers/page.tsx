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
import { createSupplier, updateSupplier, deleteSupplier } from "@/lib/actions/suppliers";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/hooks/useToast";
import type { Supplier } from "@/types";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: sup }, { data: { user } }] = await Promise.all([
        supabase.from("suppliers").select("*").order("name"),
        supabase.auth.getUser(),
      ]);
      setSuppliers((sup ?? []) as Supplier[]);
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
      <PageHeader title="Suppliers" description={`${suppliers.length} suppliers`}>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
              <SupplierForm
                onSubmit={async (data) => {
                  const result = await createSupplier(data);
                  if (!result.success) { toast({ title: "Error", description: result.error, variant: "destructive" }); return; }
                  setSuppliers((prev) => [...prev, result.data as Supplier].sort((a, b) => a.name.localeCompare(b.name)));
                  toast({ title: "Supplier created" });
                  setCreateOpen(false);
                }}
                onCancel={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {suppliers.length === 0 ? (
        <EmptyState title="No suppliers yet" description="Add your first supplier to get started." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Notes</TableHead>
                  {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.contact_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.phone ?? "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{s.notes ?? "—"}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog
                            open={editItem?.id === s.id}
                            onOpenChange={(o) => { if (!o) setEditItem(null); else setEditItem(s); }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Edit Supplier</DialogTitle></DialogHeader>
                              <SupplierForm
                                defaultValues={s}
                                onSubmit={async (data) => {
                                  const result = await updateSupplier(s.id, data);
                                  if (!result.success) { toast({ title: "Error", description: result.error, variant: "destructive" }); return; }
                                  setSuppliers((prev) => prev.map((x) => x.id === s.id ? result.data as Supplier : x));
                                  toast({ title: "Supplier updated" });
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
                            title="Delete Supplier?"
                            description={`Delete "${s.name}"? Items linked to this supplier will have it removed.`}
                            confirmLabel="Delete"
                            onConfirm={async () => {
                              const result = await deleteSupplier(s.id);
                              if (!result.success) { toast({ title: "Error", description: result.error, variant: "destructive" }); return; }
                              setSuppliers((prev) => prev.filter((x) => x.id !== s.id));
                              toast({ title: "Supplier deleted" });
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

function SupplierForm({
  defaultValues,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Supplier;
  onSubmit: (data: Omit<Supplier, "id" | "created_at" | "updated_at">) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: defaultValues?.name ?? "",
    contact_name: defaultValues?.contact_name ?? "",
    email: defaultValues?.email ?? "",
    phone: defaultValues?.phone ?? "",
    address: defaultValues?.address ?? "",
    notes: defaultValues?.notes ?? "",
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
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      notes: form.notes || null,
    });
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Contact Name</Label>
          <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Address</Label>
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Supplier"}</Button>
      </DialogFooter>
    </form>
  );
}
