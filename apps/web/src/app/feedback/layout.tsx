export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center">
      <div className="w-full max-w-md lg:border-x lg:border-border">{children}</div>
    </div>
  );
}
