import { HouseRequired } from "@/components/HouseRequired";
import { PreloadCategoryImages } from "@/components/PreloadCategoryImages";
import { PullToRefresh } from "@/components/PullToRefresh";
import { TabBar } from "@/components/TabBar";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center">
      <div className="w-full max-w-md pb-[calc(4rem+env(safe-area-inset-bottom))] lg:border-x lg:border-border">
        <PullToRefresh>
          <HouseRequired>{children}</HouseRequired>
        </PullToRefresh>
      </div>
      <TabBar />
      <PreloadCategoryImages />
    </div>
  );
}
