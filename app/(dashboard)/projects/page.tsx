import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { CrudTable } from "@/components/shared/CrudTable";
import { createProject, updateProject, deleteProject } from "@/lib/actions/projects";

export default async function ProjectsPage() {
  const supabase = await createClient();

  const [{ data: projects }, { data: { user } }] = await Promise.all([
    supabase.from("projects").select("*").order("name"),
    supabase.auth.getUser(),
  ]);

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={`${projects?.length ?? 0} projects`}
      />
      <CrudTable
        items={projects ?? []}
        label="Project"
        isAdmin={isAdmin}
        onCreate={(data) => createProject(data)}
        onUpdate={(id, data) => updateProject(id, data)}
        onDelete={(id) => deleteProject(id)}
      />
    </div>
  );
}
