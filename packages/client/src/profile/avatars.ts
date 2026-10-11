import { useQuery } from "@tanstack/react-query";

import { fetchAvatars } from "./api";

const FIVE_MINUTES_MS = 5 * 60_000;

export function useAvatars(enabled: boolean) {
  return useQuery({
    queryKey: ["profile", "avatars"],
    queryFn: fetchAvatars,
    enabled,
    staleTime: FIVE_MINUTES_MS,
  });
}
