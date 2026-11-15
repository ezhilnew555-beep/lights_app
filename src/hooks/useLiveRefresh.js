// Re-run a price refresh when the screen gains focus, and every minute while
// it stays focused, the app is in the foreground and the NSE market is open.
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { isMarketOpen } from "../services/livePriceService";

const TICK_MS = 60 * 1000;

export const useLiveRefresh = (refresh, { intervalMs = TICK_MS } = {}) => {
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      latest.current?.();
      const timer = setInterval(() => {
        if (AppState.currentState === "active" && isMarketOpen()) latest.current?.();
      }, intervalMs);
      return () => clearInterval(timer);
    }, [intervalMs])
  );
};

export default useLiveRefresh;
