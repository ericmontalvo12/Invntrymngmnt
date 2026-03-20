"use client";

import { useState } from "react";
import { updateReorderStatus } from "@/lib/actions/inventory";
import { toast } from "@/lib/hooks/useToast";
import type { ReorderStatus } from "@/types";

interface ReorderStatusSelectProps {
  itemId: string;
  currentStatus: ReorderStatus;
}

export function ReorderStatusSelect({ itemId, currentStatus }: ReorderStatusSelectProps) {
  const [status, setStatus] = useState<ReorderStatus>(currentStatus);
  const [loading, setLoading] = useState(false);

  async function handleChange(newStatus: ReorderStatus) {
    setLoading(true);
    const result = await updateReorderStatus(itemId, newStatus);
    setLoading(false);
    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    setStatus(newStatus);
    toast({ title: "Status updated" });
  }

  return (
    <select
      value={status}
      disabled={loading}
      className="rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
      onChange={(e) => handleChange(e.target.value as ReorderStatus)}
    >
      <option value="needs_reorder">Needs Reorder</option>
      <option value="ordered">Ordered</option>
      <option value="received">Received</option>
    </select>
  );
}
