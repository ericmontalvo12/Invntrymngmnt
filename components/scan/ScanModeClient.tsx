"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UpcWorkflow } from "./UpcWorkflow";
import { PackageCheck, PackageMinus } from "lucide-react";

export function ScanModeClient() {
  const [mode, setMode] = useState<"receive" | "dispatch">("receive");

  return (
    <Tabs value={mode} onValueChange={(v) => setMode(v as "receive" | "dispatch")}>
      <TabsList className="h-12">
        <TabsTrigger value="receive" className="gap-2 px-6">
          <PackageCheck className="h-4 w-4" />
          Receive Stock
        </TabsTrigger>
        <TabsTrigger value="dispatch" className="gap-2 px-6">
          <PackageMinus className="h-4 w-4" />
          Dispatch Stock
        </TabsTrigger>
      </TabsList>
      <TabsContent value="receive" className="mt-6">
        <UpcWorkflow mode="receive" />
      </TabsContent>
      <TabsContent value="dispatch" className="mt-6">
        <UpcWorkflow mode="dispatch" />
      </TabsContent>
    </Tabs>
  );
}
