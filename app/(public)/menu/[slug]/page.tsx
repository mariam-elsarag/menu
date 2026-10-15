import { CustomerMenu } from "@/components/menu/customer-menu";
import { getPublicMenuBySlug } from "@/lib/public-menu";

export default async function MenuPage({ params }: PageProps<"/menu/[slug]">) {
  const { slug } = await params;
  const result = await getPublicMenuBySlug(slug);

  if (result.status === "found") {
    return <CustomerMenu menu={result.menu} />;
  }

  if (result.status === "not-found") {
    return <CustomerMenu menu={null} state="not-found" />;
  }

  return <CustomerMenu menu={null} state="error" />;
}
