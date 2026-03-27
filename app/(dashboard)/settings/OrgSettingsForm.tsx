"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createOrganization, updateOrganizationName } from "@/lib/actions/organization";

interface OrgSettingsFormProps {
  hasOrg: boolean;
  orgName: string | null;
}

export function OrgSettingsForm({ hasOrg, orgName }: OrgSettingsFormProps) {
  const [name, setName] = useState(orgName ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }
    setLoading(true);
    try {
      if (hasOrg) {
        const result = await updateOrganizationName(name);
        if (result.success) {
          setSuccess("Organization name updated");
          setIsEditing(false);
        } else {
          setError(result.error);
        }
      } else {
        const result = await createOrganization(name);
        if (result.success) {
          setSuccess("Organization created");
        } else {
          setError(result.error);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
        <CardDescription>
          {hasOrg ? "Manage your organization name" : "Create your organization to enable multi-tenant data isolation"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasOrg && !isEditing ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Organization name</p>
              <p className="font-medium">{orgName}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setIsEditing(true); setError(null); setSuccess(null); }}>
              Edit
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter organization name"
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : hasOrg ? "Save" : "Create Organization"}
              </Button>
              {hasOrg && isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setIsEditing(false); setName(orgName ?? ""); setError(null); setSuccess(null); }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
        {!isEditing && success && <p className="text-sm text-green-600 mt-2">{success}</p>}
      </CardContent>
    </Card>
  );
}
