import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import { Text } from "../../components/pulse/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserSession } from "../../utils/secureStorage";
import { LigthsOnGlyph, BRAND } from "../../components/brand/LigthsOnLogo";
import { Press } from "../../components/pulse";


export default function SplashScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const { width, height } = useWindowDimensions();
  const isCompact = width < 360;
  const styles = useMemo(
    () => createStyles(width, height, isCompact),
    [width, height, isCompact]
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkOnboardingAndLoginStatus = async () => {
      try {
        const hasSeenOnboarding = await AsyncStorage.getItem(
          "hasSeenOnboarding"
        );
        const userInfo = await getUserSession();

        if (userInfo) {
          console.log(
            "SplashScreen: User is already logged in, navigating to MainApp."
          );
          navigation.replace("MainApp", {
            screen: "Calendar",
            params: { screen: "CalendarMain" },
          });
        } else if (hasSeenOnboarding === "true") {
          console.log(
            "SplashScreen: Onboarding seen, not logged in. Navigating directly to Login."
          );
          navigation.replace("Login");
        } else {
          console.log(
            "SplashScreen: Onboarding not seen, proceeding with splash animations."
          );
          Animated.sequence([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.delay(300),
            Animated.parallel([
              Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(buttonFade, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }),
            ]),
          ]).start();
        }
      } catch (error) {
        console.error("Error in SplashScreen useEffect:", error);
        navigation.replace("Login");
      }
    };

    checkOnboardingAndLoginStatus();
  }, []);

  const handleGetStarted = async () => {
    setLoading(true);
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
    } catch (e) {
      console.error("Error setting onboarding flag:", e);
    } finally {
      setTimeout(() => {
        navigation.replace("Login");
        setLoading(false);
      }, 800);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.ink} />
      <View style={styles.container}>
        <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
          <LigthsOnGlyph width={Math.min(width * 0.5, 220)} />
        </Animated.View>

        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: slideAnim.interpolate({ inputRange: [0, 50], outputRange: [1, 0] }),
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text mono style={styles.overline}>
            LIGTHS ON
          </Text>
          <Text style={styles.title}>Learn, invest and grow towards heavenly success.</Text>
          <Text style={styles.description}>
            Take control of your financial future with one app for spending, investing and planning.
          </Text>

          <Animated.View style={{ opacity: buttonFade }}>
            <Press scaleTo={0.96}
              style={styles.button}
              onPress={handleGetStarted}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{loading ? "Loading…" : "Get started"}</Text>
              {!loading ? <Feather name="arrow-right" size={20} color={BRAND.ink} /> : null}
            </Press>
          </Animated.View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// Brand welcome — always on the dark brand background, like the app icon
const createStyles = (width, height, isCompact) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: BRAND.ink },
    container: { flex: 1, paddingHorizontal: 24, paddingBottom: 28 },
    hero: { flex: 1, alignItems: "center", justifyContent: "center" },
    contentContainer: { gap: 14 },
    overline: { fontSize: 11, letterSpacing: 2.2, color: BRAND.lime },
    title: {
      fontSize: isCompact ? 30 : 36,
      lineHeight: isCompact ? 33 : 39,
      letterSpacing: -1.3,
      fontWeight: "600",
      color: "#E9F0EB",
    },
    description: { fontSize: 15, lineHeight: 23, color: "#AAB6AE", marginBottom: 10 },
    button: {
      height: 52,
      borderRadius: 14,
      backgroundColor: BRAND.lime,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    buttonText: { fontSize: 15, fontWeight: "600", color: BRAND.ink },
  });
