import { notFound } from "next/navigation";
import { ComponentsShowcase } from "@/components/shared/components-showcase";

export default function ComponentsShowcasePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ComponentsShowcase />;
}
