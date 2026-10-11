import type { InviteFailureStatus, InvitePreview } from "@kinwoo/core/houses";
import { TOAST_MESSAGES } from "@kinwoo/core/toast";
import { useState } from "react";

import { toast } from "../toast";
import { houseErrorFromCause } from "./errors";
import { useJoinHouse } from "./mutations";
import { useInvitePreview } from "./queries";

export type JoinFlow = {
  loading: boolean;
  loadError: string | null;
  preview: Extract<InvitePreview, { houseId: string }> | null;
  failure: InviteFailureStatus | null;
  requested: boolean;
  join: () => Promise<void>;
  joining: boolean;
};

// Preview first, then a single join. Failure statuses from either step collapse into `failure`
// so the screen only has one dead-end to render.
export function useJoinFlow(code: string, onJoined: (houseId: string) => void): JoinFlow {
  const previewQuery = useInvitePreview(code);
  const joinMutation = useJoinHouse();

  const [joinFailure, setJoinFailure] = useState<InviteFailureStatus | null>(null);
  const [requested, setRequested] = useState(false);

  const previewData = previewQuery.data;
  const usable = previewData && "houseId" in previewData ? previewData : null;
  const previewFailure = previewData && !("houseId" in previewData) ? previewData.status : null;

  const join = async () => {
    try {
      const result = await joinMutation.mutateAsync(code);

      if (result.status === "joined" || result.status === "already_member") {
        if (result.status === "joined") toast.success(TOAST_MESSAGES.houseJoined);
        onJoined(result.houseId);
      } else if (result.status === "pending") {
        toast.info(TOAST_MESSAGES.joinRequested);
        setRequested(true);
      } else {
        setJoinFailure(result.status);
      }
    } catch (cause) {
      toast.error(houseErrorFromCause(cause));
    }
  };

  return {
    loading: previewQuery.isPending,
    loadError: previewQuery.isError ? houseErrorFromCause(previewQuery.error) : null,
    preview: usable,
    failure: joinFailure ?? previewFailure,
    requested,
    join,
    joining: joinMutation.isPending,
  };
}
