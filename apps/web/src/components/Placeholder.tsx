export function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-10 text-center">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-[calc(14px*var(--font-scale,1))] leading-[normal] text-muted-foreground">
        {description}
      </p>
    </main>
  );
}
