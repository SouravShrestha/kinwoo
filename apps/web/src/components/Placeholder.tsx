/** Stands in for a route that has no feature behind it yet. */
export function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-10 text-center">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </main>
  );
}
