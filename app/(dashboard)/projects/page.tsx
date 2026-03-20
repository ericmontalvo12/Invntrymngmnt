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
import { createProject, updateProject, deleteProject } from "@/lib/actions/projects";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/hooks/useToast";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Project | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [
        { data: projs },
        {
          data: { user },
        },
      ] = await Promise.all([
        supabase.from("projects").select("*").order("name"),
        supabase.auth.getUser(),
      ]);
      setProjects((projs ?? []) as Project[]);
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
      <PageHeader title="Projects" description={`${projects.length} projects`}>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Project</DialogTitle>
              </DialogHeader>
              <ProjectForm
                onSubmit={async (data) => {
                  const result = await createProject(data);
                  if (!result.success) {
                    toast({
                      title: "Error",
                      description: result.error,
                      variant: "destructive",
                    });
                    return;
                  }
                  setProjects((prev) =>
                    [...prev, result.data as Project].sort((a, b) =>
                      a.name.localeCompare(b.name)
                    )
                  );
                  toast({ title: "Project created" });
                  setCreateOpen(false);
                }}
                onCancel={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Add your first project to get started."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  {isAdmin && (
                    <TableHead className="w-[100px]">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground">
                      {p.description ?? "—"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog
                            open={editItem?.id === p.id}
                            onOpenChange={(o) => {
                              if (!o) setEditItem(null);
                              else setEditItem(p);
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
                                <DialogTitle>Edit Project</DialogTitle>
                              </DialogHeader>
                              <ProjectForm
                                defaultValues={p}
                                onSubmit={async (data) => {
                                  const result = await updateProject(p.id, data);
                                  if (!result.success) {
                                    toast({
                                      title: "Error",
                                      description: result.error,
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  setProjects((prev) =>
                                    prev.map((x) =>
                                      x.id === p.id
                                        ? (result.data as Project)
                                        : x
                                    )
                                  );
                                  toast({ title: "Project updated" });
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
                            title="Delete Project?"
                            description={`Delete "${p.name}"? POs linked to this project will have it removed.`}
                            confirmLabel="Delete"
                            onConfirm={async () => {
                              const result = await deleteProject(p.id);
                              if (!result.success) {
                                toast({
                                  title: "Error",
                                  description: result.error,
                                  variant: "destructive",
                                });
                                return;
                              }
                              setProjects((prev) =>
                                prev.filter((x) => x.id !== p.id)
                              );
                              toast({ title: "Project deleted" });
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

function ProjectForm({
  defaultValues,
  onSubmit,
  onCancel,
}: {
  defaultValues?: Project;
  onSubmit: (
    data: Omit<Project, "id" | "created_at" | "updated_at">
  ) => Promise<void>;
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
          {loading ? "Saving..." : "Save Project"}
        </Button>
      </DialogFooter>
    </form>
  );
}
