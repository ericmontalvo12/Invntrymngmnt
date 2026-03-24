import { notFound } from "next/navigation";
import features from "@/lib/features";

export default function WorkOrdersLayout({ children }: { children: React.ReactNode }) {
  if (!features.workOrders) notFound();
  return <>{children}</>;
}
