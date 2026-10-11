import { useRouter } from "next/navigation";
import { useMemo } from "react";

export function useHouseNavigation() {
  const router = useRouter();

  return useMemo(
    () => ({
      goHome: () => router.replace("/"),
      // A direct visit or a shared link has nothing behind it to go back to.
      goBack: () => (window.history.length > 1 ? router.back() : router.replace("/")),
    }),
    [router],
  );
}
