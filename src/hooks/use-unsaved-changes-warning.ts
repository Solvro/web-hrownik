"use client";

import { useEffect, useRef } from "react";

const message = "Masz niezapisane zmiany. Opuścić formularz?";
const noRelease = async () => {
  await Promise.resolve();
};

export function useUnsavedChangesWarning(enabled: boolean) {
  const mounted = useRef(true);
  const releaseRef = useRef<() => Promise<void>>(noRelease);
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
    let guardIndex = 0;
    // Set when we trigger a traversal ourselves, so its popstate is not re-prompted.
    let ignorePop = false;
    let ignoreNav = false;
    const url = window.location.href;

    function navigationIndex() {
      return "navigation" in window
        ? window.navigation.currentEntry?.index
        : undefined;
    }

    // Drops our guard entry and resolves once the traversal has landed.
    async function leave() {
      return new Promise<void>((resolve) => {
        if (!guarded) {
          resolve();
          return;
        }
        removeListeners();
        guarded = false;
        // Fallback: never hang the caller if no popstate arrives.
        const timer = setTimeout(resolve, 500);
        window.addEventListener(
          "popstate",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
        history.back();
      });
    }

    // Primary guard for history traversals where the Navigation API exists: the
    // router unmounts the form before popstate reaches us on cross-route jumps,
    // but a navigate event can still be cancelled.
    function handleNavigate(event: NavigateEvent) {
      if (event.navigationType !== "traverse") {
        return;
      }
      if (ignoreNav) {
        ignoreNav = false;
        return;
      }
      if (!event.cancelable) {
        return;
      }
      const target = event.destination.index;
      if (target === guardIndex) {
        return;
      }
      event.preventDefault();
      // eslint-disable-next-line no-alert
      if (!window.confirm(message)) {
        return;
      }
      removeListeners();
      guarded = false;
      // One step back lands on the form's own URL; skip past it.
      const destination =
        target === guardIndex - 1 && guardIndex >= 2 ? target - 1 : target;
      const nav = event.target as Navigation;
      setTimeout(() => {
        const entry = nav.entries().at(destination);
        if (entry !== undefined) {
          void nav.traverseTo(entry.key).finished?.catch(() => null);
        }
      }, 0);
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    function handleClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest("a[href]");
      if (link === null || !(link instanceof HTMLAnchorElement)) {
        return;
      }
      if (
        link.target !== "" ||
        link.origin !== window.location.origin ||
        link.hasAttribute("download") ||
        // Hash / same-page links don't leave the form.
        link.pathname + link.search ===
          window.location.pathname + window.location.search ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      // Native confirm is intentional here: it is the only browser-level API
      // that can synchronously cancel arbitrary link navigation.
      // eslint-disable-next-line no-alert
      if (window.confirm(message)) {
        // Remove our guard entry first so the link doesn't leave two edit
        // entries in history, then replay the click.
        void leave().then(() => {
          link.click();
        });
      }
    }

    function handlePopState(event: PopStateEvent) {
      if (ignorePop) {
        ignorePop = false;
        return;
      }
      const delta = navigationIndex();
      const distance = delta === undefined ? undefined : guardIndex - delta;
      // Already on the guard entry (e.g. our own traversal landed): nothing to ask.
      if (distance === 0) {
        return;
      }
      // One step back from the guard lands on our own URL; anything else is a
      // multi-entry jump (e.g. history menu) and we are already at the target.
      const jumped =
        distance === undefined ? window.location.href !== url : distance !== 1;
      // eslint-disable-next-line no-alert
      const leaving = window.confirm(message);
      if (jumped) {
        if (leaving) {
          removeListeners();
          guarded = false;
        } else {
          // Hide the jump from the Next.js router, which would otherwise unmount
          // the form before we get to restore the guard entry.
          event.stopImmediatePropagation();
          ignorePop = true;
          ignoreNav = true;
          if (distance === undefined) {
            history.forward();
          } else {
            history.go(distance);
          }
        }
      } else if (leaving) {
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
      window.removeEventListener("popstate", handlePopState, true);
      if ("navigation" in window) {
        window.navigation.removeEventListener("navigate", handleNavigate);
      }
    }

    history.pushState(null, "", window.location.href);
    guardIndex = navigationIndex() ?? 0;
    releaseRef.current = leave;
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    // Capture phase: must run before the Next.js router's own popstate handler,
    // which synchronously unmounts the form on cross-route traversals.
    window.addEventListener("popstate", handlePopState, true);
    if ("navigation" in window) {
      window.navigation.addEventListener("navigate", handleNavigate);
    }
    return () => {
      removeListeners();
      releaseRef.current = noRelease;
      // Warning switched off while the form stays mounted (e.g. edits reverted):
      // drop our guard entry so Back doesn't land on a duplicate of the form
      // page. Not on unmount — then a navigation is already in flight.
      if (guarded && mounted.current) {
        history.back();
      }
    };
  }, [enabled]);

  // Call before a programmatic navigation after a successful save.
  return { release: async () => releaseRef.current() };
}
