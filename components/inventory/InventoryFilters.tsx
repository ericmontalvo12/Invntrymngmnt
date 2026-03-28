"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useEffect, useState } from "react";
import type { Building, Category, Supplier } from "@/types";

const ALL_VALUE = "__all__";

interface InventoryFiltersProps {
  categories: Category[];
  buildings: Building[];
  suppliers: Supplier[];
}

export function InventoryFilters({ categories, buildings, suppliers }: InventoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebounce(search, 300);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== ALL_VALUE) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // reset pagination
      router.push(`/inventory?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    updateParam("q", debouncedSearch || null);
  }, [debouncedSearch]); // eslint-disable-line

  function clearAll() {
    setSearch("");
    router.push("/inventory");
  }

  const hasFilters =
    searchParams.has("q") ||
    searchParams.has("category") ||
    searchParams.has("building") ||
    searchParams.has("supplier") ||
    searchParams.has("stock") ||
    searchParams.has("status");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full flex-1 sm:min-w-[220px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name, SKU, UPC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Select
        value={searchParams.get("category") ?? ALL_VALUE}
        onValueChange={(v) => updateParam("category", v)}
      >
        <SelectTrigger className="flex-1 sm:w-[150px] sm:flex-none">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All Categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("building") ?? ALL_VALUE}
        onValueChange={(v) => updateParam("building", v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Building" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All Buildings</SelectItem>
          {buildings.map((b) => (
            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("supplier") ?? ALL_VALUE}
        onValueChange={(v) => updateParam("supplier", v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Supplier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All Suppliers</SelectItem>
          {suppliers.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("stock") ?? ALL_VALUE}
        onValueChange={(v) => updateParam("stock", v)}
      >
        <SelectTrigger className="flex-1 sm:w-[140px] sm:flex-none">
          <SelectValue placeholder="Stock" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All Stock</SelectItem>
          <SelectItem value="ok">In Stock</SelectItem>
          <SelectItem value="low">Low Stock</SelectItem>
          <SelectItem value="out">Out of Stock</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("status") ?? ALL_VALUE}
        onValueChange={(v) => updateParam("status", v)}
      >
        <SelectTrigger className="flex-1 sm:w-[130px] sm:flex-none">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="discontinued">Discontinued</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
