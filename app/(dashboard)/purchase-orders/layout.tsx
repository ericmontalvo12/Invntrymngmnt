import { notFound } from "next/navigation";
import features from "@/lib/features";

export default function PurchaseOrdersLayout({ children }: { children: React.ReactNode }) {
  if (!features.purchaseOrders) notFound();
  return <>{children}</>;
}
