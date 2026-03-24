import { notFound } from "next/navigation";
import features from "@/lib/features";

export default function VendorsLayout({ children }: { children: React.ReactNode }) {
  if (!features.vendors) notFound();
  return <>{children}</>;
}
