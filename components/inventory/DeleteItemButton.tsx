"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { deleteInventoryItem } from "@/lib/actions/inventory";
import { toast } from "@/lib/hooks/useToast";

interface DeleteItemButtonProps {
  itemId: string;
  itemName: string;
}

export function DeleteItemButton({ itemId, itemName }: DeleteItemButtonProps) {
  const router = useRouter();

  async function handleDelete() {
    const result = await deleteInventoryItem(itemId);
    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Item deleted" });
    router.push("/inventory");
  }

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="destructive">
          <Trash2 className="mr-1 h-4 w-4" />
          Delete
        </Button>
      }
      title="Delete this item?"
      description={`Permanently delete "${itemName}" and all its transaction history.`}
      confirmLabel="Delete"
      onConfirm={handleDelete}
    />
  );
}
