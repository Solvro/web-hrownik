"use client";

import { useEffect } from "react";

const message = "Masz niezapisane zmiany. Opuścić formularz?";

export function useUnsavedChangesWarning(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    function handleClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest("a[href]");
      if (link === null || !(link instanceof HTMLAnchorElement)) {
        return;
      }
      if (link.target !== "" || link.origin !== window.location.origin) {
        return;
      }
      // Native confirm is intentional here: it is the only browser-level API
      // that can synchronously cancel arbitrary link navigation.
      // eslint-disable-next-line no-alert
      if (!window.confirm(message)) {
        event.preventDefault();
      }
    }

    function handlePopState() {
      // eslint-disable-next-line no-alert
      if (!window.confirm(message)) {
        history.pushState(null, "", window.location.href);
      }
    }

    history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled]);
}
