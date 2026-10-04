"use client";

import { useEffect } from "react";
import { track } from "@/lib/stats";

/** Counts a product page view by handle, for the stats */
export default function ProductViewStat({ handle }: { handle: string }) {
  useEffect(() => track("product_view", { handle }), [handle]);
  return null;
}
