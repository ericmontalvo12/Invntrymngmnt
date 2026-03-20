import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { CrudTable } from "@/components/shared/CrudTable";
import { createLocation, updateLocation, deleteLocation } from "@/lib/actions/locations";

export default async function LocationsPage() {
  const supabase = await createClient();

  const [{ data: locations }, { data: { user } }] = await Promise.all([
    supabase.from("locations").select("*").order("name"),
    supabase.auth.getUser(),
  ]);

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description={`${locations?.length ?? 0} locations`}
      />
      <CrudTable
        items={locations ?? []}
        label="Location"
        isAdmin={isAdmin}
        onCreate={(data) => createLocation(data)}
        onUpdate={(id, data) => updateLocation(id, data)}
        onDelete={(id) => deleteLocation(id)}
      />
    </div>
  );
}
