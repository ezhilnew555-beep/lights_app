// Drop-in motion for the older full-screen popups, which are built as
//   <Modal> → overlay <View> (dim colour) → panel <View>.
// Swap those three for
//   <PopupModal> → <PopupBackdrop> → <PopupPanel placement="bottom|center">
// and keep their existing styles: the dim layer fades on its own, the
// panel springs up (bottom) or settles in (center), and closing reverses
// it faster. Same behaviour as Pulse <Sheet>, without rewriting the screen.

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Modal, StyleSheet, View } from "react-native";
import ToastHost from "./ToastHost";
import { DURATION, EASE, SPRING, reduceMotion } from "../../ux/motion";

const Ctx = createContext(null);
const WINDOW_H = Dimensions.get("window").height;

/**
 * Modal props as usual (visible, onRequestClose, statusBarTranslucent…).
 * `animationType` is ignored — the backdrop and panel animate themselves.
 * `onHidden` fires once the exit has finished.
 */
export const PopupModal = ({ visible, onHidden, children, animationType, transparent, toastHost = true, ...rest }) => {
  const [mounted, setMounted] = useState(!!visible);
  const v = useRef(new Animated.Value(0)).current;
  // Keep showing the last open content while it animates out
  const content = useRef(children);
  if (visible) content.current = children;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      v.stopAnimation();
      if (reduceMotion()) {
        Animated.timing(v, { toValue: 1, duration: DURATION.quick, useNativeDriver: true }).start();
      } else {
        Animated.spring(v, { toValue: 1, ...SPRING, overshootClamping: true, useNativeDriver: true }).start();
      }
      return;
    }
    if (!mounted) return;
    Animated.timing(v, { toValue: 0, duration: DURATION.quick + 20, easing: EASE.in, useNativeDriver: true }).start(
      ({ finished }) => {
        if (!finished) return;
        setMounted(false);
        onHidden?.();
      },
    );
  }, [visible]);

  return (
    <Modal visible={mounted} transparent animationType="none" {...rest}>
      <Ctx.Provider value={v}>{visible ? children : content.current}</Ctx.Provider>
      {toastHost ? <ToastHost inModal /> : null}
    </Modal>
  );
};

/**
 * The dimmed overlay: its background fades; its children don't. Pass
 * `component` when the overlay was a KeyboardAvoidingView or a
 * TouchableOpacity (tap outside to close); its other props pass through.
 */
export const PopupBackdrop = ({ component: C = View, style, children, ...rest }) => {
  const v = useContext(Ctx);
  const flat = StyleSheet.flatten(style) || {};
  const { backgroundColor, ...layout } = flat;
  return (
    <C style={layout} {...rest}>
      {backgroundColor ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor, opacity: v || 1 }]} />
      ) : null}
      {children}
    </C>
  );
};

/** The panel: rises from the bottom, or settles in at the centre. */
export const PopupPanel = ({ placement = "bottom", style, children, ...rest }) => {
  const v = useContext(Ctx);
  if (!v) return <View style={style} {...rest}>{children}</View>;
  const reduced = reduceMotion();
  const motion = reduced
    ? { opacity: v }
    : placement === "center"
      ? {
          opacity: v,
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        }
      : {
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [WINDOW_H * 0.6, 0] }) }],
        };
  return (
    <Animated.View style={[style, motion]} {...rest}>
      {children}
    </Animated.View>
  );
};
