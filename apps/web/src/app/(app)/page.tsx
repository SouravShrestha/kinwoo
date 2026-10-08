import { APP_NAME } from "@kinwoo/core/app";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight">{APP_NAME}</h1>
      <p className="mt-3 text-muted-foreground">Coming soon</p>
    </main>
  );
}
