import { HouseRequired } from "@/components/HouseRequired";
import { PreloadCategoryImages } from "@/components/PreloadCategoryImages";
import { PullToRefresh } from "@/components/PullToRefresh";
import { TabBar } from "@/components/TabBar";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // Screens that opt out of the tab bar mark themselves with data-no-tab-bar (see profile/layout).
    <div className="group/app flex min-h-dvh justify-center bg-background">
      <div className="w-full max-w-md pb-[calc(5rem+env(safe-area-inset-bottom))] has-[[data-no-tab-bar]]:pb-0 lg:border-x lg:border-border">
        <PullToRefresh>
          <HouseRequired>{children}</HouseRequired>
        </PullToRefresh>
      </div>
      {/* The root background matches the top header for iOS overscroll; this keeps a bottom bounce
          on the page background. Fixed elements stay put while the page rubber-bands. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-1/2 bg-background"
      />
      <TabBar />
      <PreloadCategoryImages />
    </div>
  );
}
