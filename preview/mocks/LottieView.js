// Preview stand-in for lottie-react-native (no web build without extra deps).
import React from "react";
import { View } from "react-native";

const LottieView = React.forwardRef(({ style }, ref) => <View ref={ref} style={style} />);
export default LottieView;
