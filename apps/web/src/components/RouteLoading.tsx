"use client";
import { useBusyWhile } from "@kinwoo/client/activity";
import { PageSkeleton } from "@/components/skeleton/skeletons";

// Lets a navigation commit on tap instead of freezing until the server responds.
export function RouteLoading() {
  useBusyWhile(true);
  return <PageSkeleton />;
}
