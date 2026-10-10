import { TabBar } from "@/components/TabBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center">
      <div className="w-full max-w-md pb-16 lg:border-x lg:border-border">{children}</div>
      <TabBar />
    </div>
  );
}
