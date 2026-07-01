"use client";

import { useEffect, useState } from "react";

import { formatRelativeTime } from "@/lib/relative-time";

function formatAbsolute(date: Date) {
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

/**
 * Renders a fixed, timezone-pinned label on first render (identical on the
 * server and the pre-hydration client, so hydration never mismatches), then
 * swaps to a "x temu" label after mount — a plain client-side update rather
 * than something hydration has to reconcile against server HTML.
 */
export function RelativeTime({ date }: { date: Date }) {
  const [label, setLabel] = useState(() => formatAbsolute(date));

  useEffect(() => {
    // Deliberately deferred to after mount: computing this during render
    // would use the server's clock during SSR, causing a hydration mismatch
    // against the client's clock a moment later.
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-adjust-state-on-prop-change
    setLabel(formatRelativeTime(date));
  }, [date]);

  return label;
}
