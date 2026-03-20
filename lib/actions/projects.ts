"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { projectSchema } from "@/lib/validations/projects";
import type { ActionResult, Project } from "@/types";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return { error: "Admin access required" };
  return { userId: user.id };
}

export async function createProject(
  formData: unknown
): Promise<ActionResult<Project>> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error as string };

  const parsed = projectSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { success: false, error: "Project name already exists" };
    return { success: false, error: error.message };
  }

  revalidatePath("/projects");
  return { success: true, data: data as Project };
}

export async function updateProject(
  id: string,
  formData: unknown
): Promise<ActionResult<Project>> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error as string };

  const parsed = projectSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("projects")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/projects");
  return { success: true, data: data as Project };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { success: false, error: auth.error as string };

  const supabase = await createServiceClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/projects");
  return { success: true, data: undefined };
}
