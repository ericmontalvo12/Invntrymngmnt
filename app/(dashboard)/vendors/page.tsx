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
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/actions/suppliers";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/hooks/useToast";
import type { Supplier } from "@/types";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Supplier[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [
        { data: sup },
        {
          data: { user },
        },
      ] = await Promise.all([
        supabase.from("suppliers").select("*").order("name"),
        supabase.auth.getUser(),
      ]);
      setVendors((sup ?? []) as Supplier[]);
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
      <PageHeader title="Vendors" description={`${vendors.length} vendors`}>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Vendor</DialogTitle>
              </DialogHeader>
              <VendorForm
                onSubmit={async (data) => {
                  const result = await createSupplier(data);
                  if (!result.success) {
                    toast({
                      title: "Error",
                      description: result.error,
                      variant: "destructive",
                    });
                    return;
                  }
                  setVendors((prev) =>
                    [...prev, result.data as Supplier].sort((a, b) =>
                      a.name.localeCompare(b.name)
                    )
                  );
                  toast({ title: "Vendor created" });
                  setCreateOpen(false);
                }}
                onCancel={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {vendors.length === 0 ? (
        <EmptyState
          title="No vendors yet"
          description="Add your first vendor to get started."
        />
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
                  {isAdmin && (
                    <TableHead className="w-[100px]">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {v.contact_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {v.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {v.phone ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {v.notes ?? "—"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog
                            open={editItem?.id === v.id}
                            onOpenChange={(o) => {
                              if (!o) setEditItem(null);
                              else setEditItem(v);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Vendor</DialogTitle>
                              </DialogHeader>
                              <VendorForm
                                defaultValues={v}
                                onSubmit={async (data) => {
                                  const result = await updateSupplier(v.id, data);
                                  if (!result.success) {
                                    toast({
                                      title: "Error",
                                      description: result.error,
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  setVendors((prev) =>
                                    prev.map((x) =>
                                      x.id === v.id
                                        ? (result.data as Supplier)
                                        : x
                                    )
                                  );
                                  toast({ title: "Vendor updated" });
                                  setEditItem(null);
                                }}
                                onCancel={() => setEditItem(null)}
                              />
                            </DialogContent>
                          </Dialog>
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            }
                            title="Delete Vendor?"
                            description={`Delete "${v.name}"? Items linked to this vendor will have it removed.`}
                            confirmLabel="Delete"
                            onConfirm={async () => {
                              const result = await deleteSupplier(v.id);
                              if (!result.success) {
                                toast({
                                  title: "Error",
                                  description: result.error,
                                  variant: "destructive",
                                });
                                return;
                              }
                              setVendors((prev) =>
                                prev.filter((x) => x.id !== v.id)
                              );
                              toast({ title: "Vendor deleted" });
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

function VendorForm({
  defaultValues,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Supplier;
  onSubmit: (
    data: Omit<Supplier, "id" | "created_at" | "updated_at">
  ) => Promise<void>;
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
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Contact Name</Label>
          <Input
            value={form.contact_name}
            onChange={(e) => set("contact_name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Address</Label>
          <Input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Vendor"}
        </Button>
      </DialogFooter>
    </form>
  );
}
