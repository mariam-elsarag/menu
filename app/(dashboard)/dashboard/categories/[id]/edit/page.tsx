import { Suspense } from "react";
import { CategoryForm } from "@/features/categories/category-form";

function EditCategoryFallback() {
  return (
    <section className="ui-card grid gap-5 rounded-lg p-6" aria-busy="true">
      <span className="ui-skeleton h-7 w-40" />
      <span className="ui-skeleton h-44 w-full" />
      <span className="ui-skeleton h-12 w-full" />
      <span className="ui-skeleton h-12 w-full" />
    </section>
  );
}

async function EditCategoryContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CategoryForm mode="edit" categoryId={id} />;
}

export default function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditCategoryFallback />}>
      <EditCategoryContent params={params} />
    </Suspense>
  );
}
