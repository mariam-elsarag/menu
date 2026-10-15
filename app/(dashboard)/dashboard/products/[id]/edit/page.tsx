import { Suspense } from "react";
import { ProductForm } from "@/features/products/product-form";

function EditProductFallback() {
  return (
    <section className="ui-card grid gap-5 rounded-lg p-6" aria-busy="true">
      <span className="ui-skeleton h-7 w-40" />
      <span className="ui-skeleton h-44 w-full" />
      <span className="ui-skeleton h-12 w-full" />
      <span className="ui-skeleton h-12 w-full" />
    </section>
  );
}

async function EditProductContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductForm mode="edit" productId={id} />;
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditProductFallback />}>
      <EditProductContent params={params} />
    </Suspense>
  );
}
