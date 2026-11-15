import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  View,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { Text, TextInput } from "../../components/pulse/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Overline, Field, Button, ThemeToggle, Icon, FadeIn, useShake, Press } from "../../components/pulse";
import { LigthsOnMark } from "../../components/brand/LigthsOnLogo";
import Constants from "expo-constants";
import { loginUser } from "../../services/firebaseAuthService";
import { getUserSession } from "../../utils/secureStorage";
import { lookupLoginEmail } from "../../services/secureFunctions";
import LottieView from "lottie-react-native";
import mainLoadingAnimation from "../../../animations/mainloading.json";
import { P } from "../../theme/theme";
import haptics from "../../ux/haptics";

export default function LoginScreenView({ navigation }) {
  const { width, height } = useWindowDimensions();
  const isCompact = width < 360;
  const styles = useMemo(
    () => createStyles(width, height, isCompact),
    [width, height, isCompact]
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const passwordRef = useRef(null);

  // Show the message, buzz and shake the fields once, so a failed attempt
  // is felt as well as seen
  const [shakeStyle, shake] = useShake();
  const fail = (message) => {
    haptics.error();
    shake();
    setError(message);
  };

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userInfo = await getUserSession();
        if (userInfo) {
          console.log("✅ User already logged in");
          navigation.navigate("MainApp", {
            screen: "Calendar",
            params: { screen: "CalendarMain" },
          });
        }
      } catch (error) {
        console.error("Error checking login status:", error);
      }
    };
    checkLoginStatus();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      fail(!username.trim() ? "Enter your email or username." : "Enter your password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      let emailToUse = username.trim();

      if (!emailToUse.includes("@")) {
        // Resolved on the server; the app cannot read other users' profiles.
        try {
          emailToUse = await lookupLoginEmail(emailToUse);
        } catch (lookupErr) {
          fail("No account found with that username. Check the spelling or use your email.");
          setLoading(false);
          return;
        }
      }

      await loginUser(emailToUse, password);
      console.log("✅ Firebase Login Successful");

      haptics.success();
      setShowSuccessAnimation(true);
      // A short beat for the success animation; long enough to register, not to wait on
      setTimeout(() => {
        navigation.navigate("MainApp", {
          screen: "Calendar",
          params: { screen: "CalendarMain" },
        });
      }, 700);
    } catch (err) {
      console.error("❌ Login Error:", err.code, err.message);
      // Firebase reports a wrong password and an unknown email the same way
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        fail("That email/username and password don't match. Try again or reset your password.");
      } else if (err.code === "auth/user-not-found") {
        fail("No account uses that email. Create one below.");
      } else if (err.code === "auth/too-many-requests") {
        fail("Too many attempts. Wait a few minutes, or reset your password.");
      } else if (err.code === "auth/network-request-failed") {
        fail("You seem to be offline. Check your connection and try again.");
      } else {
        fail("Couldn't log you in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
              <View style={styles.topRow}>
                <LigthsOnMark size={40} />
                <ThemeToggle />
              </View>

              <View style={{ flexGrow: 1, minHeight: isCompact ? 24 : 48 }} />

              <FadeIn style={{ gap: 16 }}>
                <Overline>Session · signed out</Overline>
                <Text style={styles.title}>Log in to LigthsON</Text>
                <Text style={styles.subtitle}>Track, invest and plan from one terminal.</Text>
              </FadeIn>

              <FadeIn delay={70}>
              <Animated.View style={[{ gap: 16 }, shakeStyle]}>
              <Field
                label="Email or username"
                placeholder="you@example.com"
                value={username}
                onChangeText={(t) => {
                  setUsername(t);
                  if (error) setError("");
                }}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="username"
              />

              <View style={{ gap: 6 }}>
                <Overline>Password</Overline>
                <View style={styles.passwordWrap}>
                  <TextInput
                    ref={passwordRef}
                    placeholder="At least 8 characters"
                    style={styles.passwordInput}
                    secureTextEntry={!showPassword}
                    placeholderTextColor={P.mute}
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      if (error) setError("");
                    }}
                    textContentType="password"
                    autoComplete="password"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                  />
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eye}
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  >
                    <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={P.mute} />
                  </Press>
                </View>
              </View>
              </Animated.View>
              </FadeIn>

              {error ? (
                <FadeIn offset={-4} duration={200}>
                  <View style={styles.errorRow} accessibilityLiveRegion="polite" accessibilityRole="alert">
                    <Icon name="alert" size={15} color={P.neg} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                </FadeIn>
              ) : null}

              <Press scaleTo={0.96} activeOpacity={0.7}
                style={styles.forgot}
                onPress={() => navigation.navigate("ForgotPassword")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Press>

              <FadeIn delay={140} style={{ gap: 16 }}>
                <Button title="Log in" onPress={handleLogin} loading={loading} />
                <Button title="Create an account" variant="ghost" onPress={() => navigation.navigate("SignUp")} />
              </FadeIn>

              <View style={styles.secureRow}>
                <Icon name="lock" size={14} color={P.mute} />
                <Text style={styles.secureText}>Protected by your security PIN</Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>

      {showSuccessAnimation && (
        <View style={styles.animationOverlay}>
          <LottieView source={mainLoadingAnimation} autoPlay loop={false} style={styles.successAnimation} />
        </View>
      )}
    </SafeAreaView>
  );
}

// Pulse "login" artboard
const createStyles = (width, height, isCompact) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: P.bg },
    keyboardAvoidingView: { flex: 1 },
    scrollViewContent: { flexGrow: 1 },
    container: {
      flex: 1,
      paddingTop: 16,
      paddingHorizontal: 20,
      paddingBottom: 24,
      gap: 16,
      width: "100%",
      maxWidth: 480,
      alignSelf: "center",
    },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    mark: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: P.acc,
      alignItems: "center",
      justifyContent: "center",
    },
    markText: { fontSize: 18, fontWeight: "700", color: P.accInk },
    title: {
      fontSize: isCompact ? 34 : 40,
      lineHeight: isCompact ? 36 : 42,
      letterSpacing: -1.6,
      fontWeight: "600",
      color: P.ink,
    },
    subtitle: { fontSize: 15, color: P.ink2, marginBottom: 8 },
    passwordWrap: {
      height: 48,
      borderWidth: 1,
      borderColor: P.line,
      borderRadius: 12,
      backgroundColor: P.surf2,
      flexDirection: "row",
      alignItems: "center",
    },
    passwordInput: { flex: 1, height: 48, paddingHorizontal: 14, fontSize: 15, color: P.ink },
    eye: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    errorRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      padding: 10,
      borderRadius: 10,
      backgroundColor: P.negSoft,
    },
    errorText: { flex: 1, color: P.neg, fontSize: 13, lineHeight: 18 },
    forgot: { alignSelf: "flex-end", height: 32, justifyContent: "center" },
    forgotText: { color: P.accTx, fontSize: 14, fontWeight: "600" },
    secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
    secureText: { fontSize: 12, color: P.mute },
    animationOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: P.overlay,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    successAnimation: {
      width: Math.min(width * 0.6, 200),
      height: Math.min(width * 0.6, 200),
    },
  });
