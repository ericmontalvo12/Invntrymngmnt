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
import { createBuilding, updateBuilding, deleteBuilding } from "@/lib/actions/buildings";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/hooks/useToast";
import type { Building } from "@/types";

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Building | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [
        { data: blds },
        {
          data: { user },
        },
      ] = await Promise.all([
        supabase.from("buildings").select("*").order("name"),
        supabase.auth.getUser(),
      ]);
      setBuildings((blds ?? []) as Building[]);
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
      <PageHeader title="Buildings" description={`${buildings.length} buildings`}>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" />
                Add Building
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Building</DialogTitle>
              </DialogHeader>
              <BuildingForm
                onSubmit={async (data) => {
                  const result = await createBuilding(data);
                  if (!result.success) {
                    toast({
                      title: "Error",
                      description: result.error,
                      variant: "destructive",
                    });
                    return;
                  }
                  setBuildings((prev) =>
                    [...prev, result.data as Building].sort((a, b) =>
                      a.name.localeCompare(b.name)
                    )
                  );
                  toast({ title: "Building created" });
                  setCreateOpen(false);
                }}
                onCancel={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {buildings.length === 0 ? (
        <EmptyState
          title="No buildings yet"
          description="Add your first building to get started."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Description</TableHead>
                  {isAdmin && (
                    <TableHead className="w-[100px]">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {b.address ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-muted-foreground">
                      {b.description ?? "—"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog
                            open={editItem?.id === b.id}
                            onOpenChange={(o) => {
                              if (!o) setEditItem(null);
                              else setEditItem(b);
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
                                <DialogTitle>Edit Building</DialogTitle>
                              </DialogHeader>
                              <BuildingForm
                                defaultValues={b}
                                onSubmit={async (data) => {
                                  const result = await updateBuilding(b.id, data);
                                  if (!result.success) {
                                    toast({
                                      title: "Error",
                                      description: result.error,
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  setBuildings((prev) =>
                                    prev.map((x) =>
                                      x.id === b.id
                                        ? (result.data as Building)
                                        : x
                                    )
                                  );
                                  toast({ title: "Building updated" });
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
                            title="Delete Building?"
                            description={`Delete "${b.name}"? POs linked to this building will have it removed.`}
                            confirmLabel="Delete"
                            onConfirm={async () => {
                              const result = await deleteBuilding(b.id);
                              if (!result.success) {
                                toast({
                                  title: "Error",
                                  description: result.error,
                                  variant: "destructive",
                                });
                                return;
                              }
                              setBuildings((prev) =>
                                prev.filter((x) => x.id !== b.id)
                              );
                              toast({ title: "Building deleted" });
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

function BuildingForm({
  defaultValues,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Building;
  onSubmit: (
    data: Omit<Building, "id" | "created_at" | "updated_at">
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: defaultValues?.name ?? "",
    address: defaultValues?.address ?? "",
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
      address: form.address || null,
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
          <Label>Address</Label>
          <Input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="123 Main St"
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
          {loading ? "Saving..." : "Save Building"}
        </Button>
      </DialogFooter>
    </form>
  );
}
