"use client";

import { useEffect, useRef } from "react";

const message = "Masz niezapisane zmiany. Opuścić formularz?";

export function useUnsavedChangesWarning(enabled: boolean) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let guarded = true;

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
      if (window.confirm(message)) {
        // The pop above only consumed our guard entry; go back once more so
        // the user actually leaves the form.
        removeListeners();
        guarded = false;
        history.back();
      } else {
        history.pushState(null, "", window.location.href);
      }
    }

    function removeListeners() {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    }

    history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      removeListeners();
      // Warning switched off while the form stays mounted (e.g. after a
      // successful save): drop our guard entry so Back doesn't land on a
      // duplicate of the form page. Not on unmount — then a navigation is
      // already in flight and popping would undo it.
      if (guarded && mounted.current) {
        history.back();
      }
    };
  }, [enabled]);
}
