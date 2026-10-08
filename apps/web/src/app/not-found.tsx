import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="mt-3 text-muted-foreground">This page doesn&apos;t exist.</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
      >
        Go home
      </Link>
    </main>
  );
}
