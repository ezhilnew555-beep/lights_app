// Launch loader. Takes over from the native splash (same dark background, same
// logo size and position), plays the LigthsON intro, idles while the app
// loads, then fades out over the first screen.

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { AnimatedLigthsOnLogo, BRAND } from "./LigthsOnLogo";

// Native splash: 220 dp image, artwork (212 units × 4.3) fills 912/1024 of it → ~196 dp.
const LOGO_WIDTH = 196;

const AppLoader = ({ visible, fontsReady, onLayout, onIntroEnd, onHidden }) => {
  const fade = useRef(new Animated.Value(1)).current;
  const caption = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      Animated.timing(fade, { toValue: 0, duration: 320, useNativeDriver: true }).start(({ finished }) => {
        if (finished && onHidden) onHidden();
      });
    }
  }, [visible]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}
      pointerEvents={visible ? "auto" : "none"}
      onLayout={onLayout}
    >
      <AnimatedLigthsOnLogo
        width={LOGO_WIDTH}
        onIntroEnd={() => {
          Animated.timing(caption, { toValue: 1, duration: 400, useNativeDriver: true }).start();
          onIntroEnd && onIntroEnd();
        }}
      />
      <Animated.View style={[styles.captionWrap, { opacity: caption }]}>
        <Text style={[styles.caption, fontsReady && { fontFamily: "JetBrainsMono_400Regular" }]}>
          TRACK · INVEST · GROW
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: BRAND.ink,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  captionWrap: {
    position: "absolute",
    bottom: 72,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  caption: {
    color: "#7F8C84",
    fontSize: 11,
    letterSpacing: 2.2,
  },
});

export default AppLoader;
