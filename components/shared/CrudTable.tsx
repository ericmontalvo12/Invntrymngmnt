"use client";

import { useState } from "react";
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
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "@/lib/hooks/useToast";

interface CrudItem {
  id: string;
  name: string;
  description?: string | null;
}

interface CrudTableProps {
  items: CrudItem[];
  label: string;
  isAdmin: boolean;
  onCreate: (data: { name: string; description?: string }) => Promise<{ success: boolean; error?: string }>;
  onUpdate: (id: string, data: { name: string; description?: string }) => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export function CrudTable({ items, label, isAdmin, onCreate, onUpdate, onDelete }: CrudTableProps) {
  const [editItem, setEditItem] = useState<CrudItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" />
                Add {label}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Add {label}</DialogTitle>
              </DialogHeader>
              <CrudForm
                onSubmit={async (data) => {
                  const result = await onCreate(data);
                  if (!result.success) {
                    toast({ title: "Error", description: result.error, variant: "destructive" });
                    return false;
                  }
                  toast({ title: `${label} created` });
                  setCreateOpen(false);
                  return true;
                }}
                submitLabel={`Create ${label}`}
                onCancel={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title={`No ${label.toLowerCase()}s yet`} description={`Add your first ${label.toLowerCase()} to get started.`} />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.description ?? "—"}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Dialog
                          open={editOpen && editItem?.id === item.id}
                          onOpenChange={(o) => {
                            setEditOpen(o);
                            if (o) setEditItem(item);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Edit {label}</DialogTitle>
                            </DialogHeader>
                            <CrudForm
                              defaultValues={editItem ?? undefined}
                              onSubmit={async (data) => {
                                const result = await onUpdate(item.id, data);
                                if (!result.success) {
                                  toast({ title: "Error", description: result.error, variant: "destructive" });
                                  return false;
                                }
                                toast({ title: `${label} updated` });
                                setEditOpen(false);
                                return true;
                              }}
                              submitLabel={`Update ${label}`}
                              onCancel={() => setEditOpen(false)}
                            />
                          </DialogContent>
                        </Dialog>

                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          }
                          title={`Delete ${label}?`}
                          description={`Are you sure you want to delete "${item.name}"? Items using this ${label.toLowerCase()} will have it removed.`}
                          confirmLabel="Delete"
                          onConfirm={async () => {
                            const result = await onDelete(item.id);
                            if (!result.success) {
                              toast({ title: "Error", description: result.error, variant: "destructive" });
                            } else {
                              toast({ title: `${label} deleted` });
                            }
                          }}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function CrudForm({
  defaultValues,
  onSubmit,
  submitLabel,
  onCancel,
}: {
  defaultValues?: { name: string; description?: string | null };
  onSubmit: (data: { name: string; description?: string }) => Promise<boolean>;
  submitLabel: string;
  onCancel: () => void;
}) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const ok = await onSubmit({ name, description: description || undefined });
    setLoading(false);
    if (ok) {
      setName("");
      setDescription("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="crud-name">Name *</Label>
        <Input
          id="crud-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="crud-desc">Description</Label>
        <Textarea
          id="crud-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
