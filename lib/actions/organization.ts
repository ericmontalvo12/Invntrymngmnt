"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export async function createOrganization(name: string): Promise<ActionResult<{ id: string; name: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return { success: false, error: "Admin access required" };
  if (profile.organization_id) return { success: false, error: "Organization already exists" };

  const service = await createServiceClient();
  const { data: org, error: orgError } = await service
    .from("organizations")
    .insert({ name: name.trim() })
    .select()
    .single();

  if (orgError) return { success: false, error: orgError.message };

  const { error: profileError } = await service
    .from("profiles")
    .update({ organization_id: org.id })
    .eq("id", user.id);

  if (profileError) return { success: false, error: profileError.message };

  revalidatePath("/settings");
  return { success: true, data: { id: org.id, name: org.name } };
}

export async function updateOrganizationName(name: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return { success: false, error: "Admin access required" };
  if (!profile.organization_id) return { success: false, error: "No organization found" };

  const service = await createServiceClient();
  const { error } = await service
    .from("organizations")
    .update({ name: name.trim() })
    .eq("id", profile.organization_id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  return { success: true, data: undefined };
}
