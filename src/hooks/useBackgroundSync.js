import { useEffect } from "react";

export default function useBackgroundSync(syncFunction) {
  useEffect(() => {
    if (typeof syncFunction !== "function") {
      return;
    }

    let syncing = false;
    let lastSync = 0;

    const runSync = async () => {
      if (
        document.visibilityState !== "visible" ||
        !navigator.onLine ||
        syncing
      ) {
        return;
      }

      // Avoid repeated requests when Safari fires multiple events.
      if (Date.now() - lastSync < 3000) {
        return;
      }

      syncing = true;
      lastSync = Date.now();

      try {
        await syncFunction();
      } catch (error) {
        console.error("[Aira] Background sync failed:", error);
      } finally {
        syncing = false;
      }
    };

    const handleResume = () => {
      runSync();
    };

    const handleOnline = () => {
      runSync();
    };

    window.addEventListener("aira:app-resumed", handleResume);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener(
        "aira:app-resumed",
        handleResume
      );

      window.removeEventListener("online", handleOnline);
    };
  }, [syncFunction]);
}