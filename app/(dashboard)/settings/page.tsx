import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  // Pull some stats
  const [
    { count: itemCount },
    { count: userCount },
    { count: txCount },
  ] = await Promise.all([
    supabase.from("inventory_items").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("inventory_transactions").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Application configuration and information" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Current application statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatRow label="Total Inventory Items" value={String(itemCount ?? 0)} />
            <Separator />
            <StatRow label="Total Users" value={String(userCount ?? 0)} />
            <Separator />
            <StatRow label="Total Transactions" value={String(txCount ?? 0)} />
            <Separator />
            <StatRow label="Application Version" value="1.0.0 MVP" />
            <Separator />
            <StatRow label="Database" value="Supabase (PostgreSQL)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
            <CardDescription>What each role can do</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge>Admin</Badge>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Full access to all features</li>
                <li>Create/edit/delete inventory items</li>
                <li>Manage suppliers, categories, locations</li>
                <li>Manage users and roles</li>
                <li>All stock transactions including admin overrides</li>
              </ul>
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Staff</Badge>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>View all inventory data</li>
                <li>Add/remove/adjust stock</li>
                <li>Use receiving and dispatch workflows</li>
                <li>Use scan mode</li>
              </ul>
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">Viewer</Badge>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Read-only access to all data</li>
                <li>Cannot create transactions</li>
                <li>Cannot modify any data</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Setup</CardTitle>
            <CardDescription>Run this SQL in your Supabase SQL editor to set up the schema</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Navigate to your Supabase project → SQL Editor and run the schema SQL provided in the{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">supabase/schema.sql</code> file
              in the repository root. Enable Row Level Security on all tables after running the schema.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
