/**
 * AppLockGate
 * Full-screen cover shown while the app is locked. Locks on launch (when
 * `startLocked`) and whenever the app comes back after LOCK_AFTER_MS in the
 * background. Unlocking uses the phone's own screen lock (see appLock.js).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { P, themedStyles } from "../theme/theme";
import { Text } from "./pulse/Text";
import { Button } from "./pulse";
import LigthsOnMark from "./brand/LigthsOnLogo";
import { authenticate, isAppLockEnabled, LOCK_AFTER_MS } from "../services/appLock";

const AppLockGate = ({ signedIn, startLocked, canPrompt }) => {
  const [locked, setLocked] = useState(!!startLocked);
  // The system prompt itself sends the app to the background on Android,
  // so ignore AppState changes while it is up.
  const authenticating = useRef(false);
  const backgroundedAt = useRef(null);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      if (await authenticate()) setLocked(false);
    } catch (err) {
      console.warn("App lock: authentication failed", err);
    } finally {
      // Let the AppState "active" event from closing the prompt pass first
      setTimeout(() => {
        authenticating.current = false;
      }, 500);
    }
  }, []);

  useEffect(() => {
    if (startLocked) setLocked(true);
  }, [startLocked]);

  useEffect(() => {
    if (!signedIn) setLocked(false);
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return undefined;
    const sub = AppState.addEventListener("change", async (state) => {
      if (authenticating.current) return;
      if (state === "background") {
        backgroundedAt.current = Date.now();
      } else if (state === "active" && backgroundedAt.current) {
        const away = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (away >= LOCK_AFTER_MS && (await isAppLockEnabled())) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [signedIn]);

  // Ask straight away once locked and the launch animation is out of the way
  useEffect(() => {
    if (locked && canPrompt && AppState.currentState === "active") unlock();
  }, [locked, canPrompt, unlock]);

  if (!signedIn || !locked) return null;

  return (
    <View style={styles.cover} accessibilityViewIsModal>
      <LigthsOnMark size={64} />
      <Text style={styles.title}>LigthsON is locked</Text>
      <Text style={styles.sub}>Use your fingerprint, face or phone screen lock to continue.</Text>
      <Button title="Unlock" icon="lock" onPress={unlock} style={styles.button} />
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    cover: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1000,
      elevation: 1000,
      backgroundColor: P.bg,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 12,
    },
    title: {
      marginTop: 12,
      fontSize: 20,
      fontWeight: "700",
      color: P.ink,
    },
    sub: {
      fontSize: 14,
      color: P.mute,
      textAlign: "center",
    },
    button: {
      marginTop: 16,
      alignSelf: "stretch",
    },
  })
);

export default AppLockGate;
