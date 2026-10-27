"use client";

import { useBusyWhile } from "@kinwoo/client/activity";
import type { ReactNode } from "react";

// Lets a navigation commit on tap instead of freezing until the server responds. Each route
// passes a skeleton shaped like its own screen.
export function RouteLoading({ children }: { children: ReactNode }) {
  useBusyWhile(true);
  return children;
}
