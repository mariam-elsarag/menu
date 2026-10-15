export default function SettingsPage() {
  return <PagePlaceholder title="إعدادات المطعم" />;
}

function PagePlaceholder({ title }: { title: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        هذه الصفحة قيد الإعداد.
      </p>
    </section>
  );
}
