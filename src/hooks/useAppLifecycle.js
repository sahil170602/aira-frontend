import { useEffect, useRef } from "react";

export default function useAppLifecycle() {
  const lastVisibleTime = useRef(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // The app is visible again.
        // Do not reload the page here.
        lastVisibleTime.current = Date.now();

        window.dispatchEvent(
          new CustomEvent("aira:app-resumed")
        );
      } else {
        // The app has moved to the background.
        lastVisibleTime.current = Date.now();
      }
    };

    const handlePageShow = () => {
      // Safari can restore a page from its back-forward cache.
      // Do not force a reload.
      window.dispatchEvent(
        new CustomEvent("aira:app-resumed")
      );
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow
      );
    };
  }, []);
}