import React, { useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Text, TextInput } from "../../components/pulse/Text";
import { Feather } from "@expo/vector-icons";
import { forgotPassword } from "../../services/firebaseAuthService";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, P } from "../../theme/theme";
import { Icon, Press } from "../../components/pulse";

export default function ForgotPasswordScreen({ navigation }) {
  const { height, width } = useWindowDimensions();
  const isCompact = width < 360;
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(width, height, isCompact, insets),
    [width, height, isCompact, insets]
  );
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleResetPassword = async () => {
    setError("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      console.error("Forgot password error:", err.code);
      // Never reveal whether an email is registered.
      if (err.code === "auth/user-not-found") {
        setSent(true);
      } else {
        setError(err.message || "Failed to send reset email. Please try again.");
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
          <View style={styles.container}>
            <View style={styles.headerContainer}>
              <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Back"
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Icon name="back" size={24} color={COLORS.primary} />
              </Press>

              <View style={styles.iconContainer}>
                <Icon name="lock" size={32} color={COLORS.primary} />
              </View>

              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                {sent
                  ? "Check your inbox for a password reset link."
                  : "Enter your email and we'll send you a reset link."}
              </Text>
            </View>

            {sent ? (
              <View style={styles.formContainer}>
                <View style={styles.successContainer}>
                  <Feather name="check-circle" size={64} color={COLORS.income} />
                  <Text style={styles.successTitle}>Email Sent!</Text>
                  <Text style={styles.successMsg}>
                    If an account exists for {email}, a password reset link is on its way.{"\n\n"}
                    <Text style={{ fontWeight: "bold" }}>Important:</Text> Please check your Spam or Junk folder if you don't see it in your inbox.
                  </Text>
                </View>
                <Press scaleTo={0.96}
                  style={styles.resetButton}
                  onPress={() => navigation.navigate("Login")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resetButtonText}>Back to Login</Text>
                </Press>
              </View>
            ) : (
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Feather
                    name="mail"
                    size={20}
                    color={COLORS.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Email"
                    style={styles.input}
                    placeholderTextColor={COLORS.textMuted}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError("");
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Press scaleTo={0.96}
                  style={[
                    styles.resetButton,
                    (!email || loading) && styles.resetButtonDisabled,
                  ]}
                  onPress={handleResetPassword}
                  disabled={!email || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.textInverse} />
                  ) : (
                    <Text style={styles.resetButtonText}>Send Reset Link</Text>
                  )}
                </Press>

                <View style={styles.infoContainer}>
                  <Icon name="info" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.infoText}>
                    We'll send a secure link to your registered email address.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (_width, height, isCompact, insets) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.background },
    keyboardAvoidingView: { flex: 1 },
    scrollViewContent: { flexGrow: 1, paddingBottom: SPACING[20] + insets.bottom },
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      paddingHorizontal: isCompact ? SPACING[16] : SPACING[24],
    },
    headerContainer: {
      alignItems: "center",
      marginTop: Math.max(20, height * (isCompact ? 0.04 : 0.06)),
      marginBottom: height * 0.04,
    },
    backButton: { position: "absolute", left: 0, top: Math.max(10, insets.top), padding: SPACING[8] },
    iconContainer: {
      width: isCompact ? 68 : 80,
      height: isCompact ? 68 : 80,
      borderRadius: isCompact ? 34 : 40,
      backgroundColor: COLORS.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING[24],
    },
    title: {
      fontSize: isCompact ? 24 : 28,
      fontWeight: "700",
      color: COLORS.textPrimary,
      marginBottom: SPACING[8],
      textAlign: "center",
    },
    subtitle: {
      fontSize: isCompact ? 14 : 16,
      color: COLORS.textSecondary,
      textAlign: "center",
      paddingHorizontal: isCompact ? SPACING[10] : SPACING[20],
    },
    formContainer: { width: "100%", marginBottom: SPACING[24] },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      backgroundColor: COLORS.surfaceMuted,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.md,
      marginBottom: SPACING[16],
      height: isCompact ? 52 : 56,
      paddingHorizontal: isCompact ? SPACING[12] : SPACING[16],
    },
    inputIcon: { marginRight: SPACING[12] },
    input: {
      flex: 1,
      fontSize: isCompact ? 15 : 16,
      color: COLORS.textPrimary,
      height: "100%",
    },
    errorText: {
      color: COLORS.error,
      fontSize: 14,
      marginBottom: SPACING[16],
      textAlign: "center",
    },
    resetButton: {
      backgroundColor: COLORS.primaryFill,
      width: "100%",
      height: isCompact ? 52 : 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: RADIUS.md,
      ...SHADOWS.md,
      marginBottom: SPACING[20],
    },
    resetButtonDisabled: { backgroundColor: COLORS.disabled },
    resetButtonText: {
      color: COLORS.textInverse,
      fontSize: isCompact ? 15 : 16,
      fontWeight: "700",
    },
    infoContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.surfaceMuted,
      padding: SPACING[16],
      borderRadius: RADIUS.sm,
    },
    infoText: {
      color: COLORS.textSecondary,
      fontSize: 14,
      marginLeft: SPACING[8],
      textAlign: "center",
    },
    successContainer: { alignItems: "center", paddingVertical: SPACING[32] },
    successTitle: {
      fontSize: isCompact ? 22 : 24,
      fontWeight: "700",
      color: COLORS.textPrimary,
      marginTop: SPACING[16],
      marginBottom: SPACING[12],
    },
    successMsg: {
      fontSize: isCompact ? 14 : 15,
      color: COLORS.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: SPACING[8],
    },
  });
