/** "Coming soon" body used by module pages until their epic is built. */
export function PagePlaceholder({ title }: { title: string }) {
  return (
    <section className="rounded-lg bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      <p className="text-input-size mt-2 text-gray-600">Coming soon</p>
    </section>
  );
}
