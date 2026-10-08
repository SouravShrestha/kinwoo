import { TabBar } from "@/components/TabBar";

/**
 * The app shell: a phone-width column with the bottom navigation beneath it.
 *
 * On a wide screen the column is centred and bordered so it reads as a
 * deliberate frame rather than an unstyled narrow page. pb-16 clears the fixed
 * tab bar; the bar itself handles the safe-area inset.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center">
      <div className="w-full max-w-md pb-16 lg:border-x lg:border-border">{children}</div>
      <TabBar />
    </div>
  );
}
