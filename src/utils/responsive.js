import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export const isCompactScreen = width < 360;

export const scale = (size) => (width / BASE_WIDTH) * size;
export const verticalScale = (size) => (height / BASE_HEIGHT) * size;
export const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;
