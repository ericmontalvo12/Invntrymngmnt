"use client";

import { useState, useRef, useEffect } from "react";
import { Search, CheckCircle, AlertTriangle, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StockStatusBadge } from "@/components/shared/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { receiveStock, dispatchStock } from "@/lib/actions/inventory";
import { toast } from "@/lib/hooks/useToast";
import { useScanInput } from "@/lib/hooks/useScanInput";
import { CameraScanner } from "@/components/scan/CameraScanner";
import type { InventoryItem } from "@/types";

interface UpcWorkflowProps {
  mode: "receive" | "dispatch";
}

export function UpcWorkflow({ mode }: UpcWorkflowProps) {
  const [input, setInput] = useState("");
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searching, setSearching] = useState(false);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Re-focus after each successful transaction
  function resetForm() {
    setItem(null);
    setInput("");
    setQty(1);
    setNote("");
    setNotFound(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function lookupItem(value: string) {
    if (!value.trim()) return;
    setSearching(true);
    setNotFound(false);
    setItem(null);

    const supabase = createClient();
    const { data } = await supabase
      .from("inventory_items")
      .select("*, category:categories(name), location:locations(name), supplier:suppliers(name)")
      .or(`upc.eq.${value.trim()},sku.eq.${value.trim()}`)
      .single();

    setSearching(false);
    if (data) {
      setItem(data as InventoryItem);
    } else {
      setNotFound(true);
    }
  }

  // Wire up keyboard scanner (USB scanners emulate keyboard)
  useScanInput({
    onScan: (value) => {
      setInput(value);
      lookupItem(value);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setSubmitting(true);

    const payload = { item_id: item.id, quantity: qty, note };
    const result =
      mode === "receive" ? await receiveStock(payload) : await dispatchStock(payload);

    setSubmitting(false);
    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      return;
    }

    toast({
      title: mode === "receive" ? "Stock received" : "Stock dispatched",
      description: `${qty} ${item.unit_type}(s) ${mode === "receive" ? "added to" : "removed from"} ${item.name}`,
    });
    resetForm();
  }

  function handleCameraScan(value: string) {
    setShowCamera(false);
    setInput(value);
    lookupItem(value);
  }

  return (
    <div className="space-y-6">
      {showCamera && (
        <CameraScanner onScan={handleCameraScan} onClose={() => setShowCamera(false)} />
      )}
      {/* Scan / Search Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {mode === "receive" ? "Scan or Enter UPC to Receive" : "Scan or Enter UPC to Dispatch"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                className="pl-9 text-lg font-mono"
                placeholder="UPC or SKU..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    lookupItem(input);
                  }
                }}
                autoFocus
              />
            </div>
            <Button onClick={() => lookupItem(input)} disabled={searching}>
              {searching ? "Searching..." : "Look Up"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowCamera(true)}
              aria-label="Scan with camera"
              title="Scan with camera"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Use the camera button on mobile, or plug in a USB barcode scanner.
          </p>
        </CardContent>
      </Card>

      {/* Not Found */}
      {notFound && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Item not found</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                No item matches UPC or SKU: <code className="font-mono">{input}</code>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Item Found — Action Form */}
      {item && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <CardTitle className="text-base">{item.name}</CardTitle>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  SKU: {item.sku}
                  {item.upc ? ` · UPC: ${item.upc}` : ""}
                  {" · "}
                  {(item as any).location?.name ?? "No location"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{item.quantity_on_hand}</p>
                <p className="text-xs text-muted-foreground">{item.unit_type}s on hand</p>
                <div className="mt-1">
                  <StockStatusBadge qty={item.quantity_on_hand} threshold={item.minimum_threshold} />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workflow-qty">
                  Quantity to {mode === "receive" ? "Receive" : "Dispatch"} *
                </Label>
                <Input
                  id="workflow-qty"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="max-w-[160px] text-lg"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workflow-note">Note (optional)</Label>
                <Textarea
                  id="workflow-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="PO number, reference, etc."
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={submitting}
                  className={mode === "dispatch" ? "bg-destructive hover:bg-destructive/90" : ""}
                >
                  {submitting
                    ? "Saving..."
                    : mode === "receive"
                    ? `Receive ${qty} unit${qty !== 1 ? "s" : ""}`
                    : `Dispatch ${qty} unit${qty !== 1 ? "s" : ""}`}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
