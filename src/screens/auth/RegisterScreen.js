import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Animated,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
} from "react-native";
import { Text, TextInput } from "../../components/pulse/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { registerUser, checkUsernameAvailable } from "../../services/firebaseAuthService";
import { saveUserSession } from "../../utils/secureStorage";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, P } from "../../theme/theme";
import { LigthsOnMark } from "../../components/brand/LigthsOnLogo";

import { toast, friendlyError } from "../../ux/toast";
import { celebrate } from "../../ux/celebrate";
import ToastHost from "../../components/pulse/ToastHost";
import { PopupModal, PopupBackdrop, PopupPanel } from "../../components/pulse/popup";
import { useShake, useSlideOnChange, Icon, Press } from "../../components/pulse";
const COUNTRIES = [
  { label: "India", value: "India" },
  { label: "USA", value: "USA" },
  { label: "UK", value: "UK" },
  { label: "Canada", value: "Canada" },
  { label: "Australia", value: "Australia" },
  { label: "Germany", value: "Germany" },
  { label: "France", value: "France" },
  { label: "Japan", value: "Japan" },
  { label: "China", value: "China" },
  { label: "Singapore", value: "Singapore" },
];

export default function RegisterScreenView() {
  const { width, height } = useWindowDimensions();
  const isCompact = width < 360;
  const styles = useMemo(
    () => createStyles(width, height, isCompact),
    [width, height, isCompact]
  );
  const navigation = useNavigation();

  const [isNextLoading, setIsNextLoading] = useState(false);
  const timeoutRefs = useRef({});
  const [fieldStates, setFieldStates] = useState({
    userName: "initial",
    email: "initial",
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    age: "",
    retirementAge: "",
    phoneNumber: "",
    securityPin: "",
    confirmSecurityPin: "",
  });

  const [errorMessages, setErrorMessages] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showSecurityPin, setShowSecurityPin] = useState(false);
  const [showConfirmSecurityPin, setShowConfirmSecurityPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const validatePassword = (value) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    return regex.test(value);
  };

  const validateName = (value) => /^[a-zA-Z]+$/.test(value);

  const validateField = async (name, value) => {
    let isValid = false;
    let errorMessage = "";

    switch (name) {
      case "firstName":
      case "lastName":
        if (!validateName(value)) {
          errorMessage = `Use only alphabets`;
        } else {
          isValid = true;
        }
        break;

      case "userName":
        if (value.trim().length > 2) {
          try {
            const available = await checkUsernameAvailable(value.trim().toLowerCase());
            isValid = available;
            if (!available) {
              errorMessage = "Username already exists";
              setFieldStates((prev) => ({ ...prev, [name]: "invalid" }));
            } else {
              errorMessage = "✓ Username available!";
              setFieldStates((prev) => ({ ...prev, [name]: "valid" }));
              setTimeout(() => {
                setErrorMessages((prev) => {
                  if (prev[name] === "✓ Username available!") return { ...prev, [name]: "" };
                  return prev;
                });
              }, 2000);
            }
          } catch (error) {
            console.error("Username check error:", error);
            errorMessage = "Error checking username";
            setFieldStates((prev) => ({ ...prev, [name]: "invalid" }));
          }
        } else if (value.trim()) {
          errorMessage = "Username must be at least 3 characters";
          setFieldStates((prev) => ({ ...prev, [name]: "invalid" }));
        }
        break;

      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(value)) {
          isValid = true;
          errorMessage = "✓ Email looks good!";
          setFieldStates((prev) => ({ ...prev, [name]: "valid" }));
        } else if (value.trim()) {
          errorMessage = "Enter a valid email address";
          setFieldStates((prev) => ({ ...prev, [name]: "invalid" }));
        }
        break;

      case "password":
        if (validatePassword(value)) {
          isValid = true;
        } else {
          errorMessage = "Password does not meet requirements";
        }
        break;

      case "confirmPassword":
        if (value === formData.password && value.length > 0) {
          isValid = true;
        } else if (value.length > 0) {
          errorMessage = "Passwords do not match";
        }
        break;

      case "country":
      case "age":
      case "retirementAge":
      case "phoneNumber":
        if (value.trim()) {
          isValid = true;
        } else {
          errorMessage = "This field is required";
        }
        break;

      case "securityPin":
        if (value.trim().length >= 4) {
          isValid = true;
        } else if (value.trim()) {
          errorMessage = "PIN must be at least 4 characters";
        }
        break;

      case "confirmSecurityPin":
        if (value === formData.securityPin && value.length >= 4) {
          isValid = true;
        } else if (value.length > 0) {
          errorMessage = "Security PINs do not match";
        }
        break;

      default:
        isValid = true;
    }

    setErrorMessages((prev) => ({ ...prev, [name]: errorMessage }));
    return isValid;
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (timeoutRefs.current[name]) {
      clearTimeout(timeoutRefs.current[name]);
    }

    if (name === "userName" || name === "email") {
      setFieldStates((prev) => ({ ...prev, [name]: "checking" }));
      setErrorMessages((prev) => ({ ...prev, [name]: "" }));
    }

    timeoutRefs.current[name] = setTimeout(() => {
      validateField(name, value);
    }, 500);
  };

  // Steps slide forward / back; a step that can't continue shakes
  const lastStep = useRef(currentStep);
  const stepSlide = useSlideOnChange(currentStep, currentStep >= lastStep.current ? 1 : -1);
  useEffect(() => {
    lastStep.current = currentStep;
  }, [currentStep]);
  const [shakeStyle, shake] = useShake();

  const handleNextStep = async () => {
    setIsNextLoading(true);

    try {
      if (currentStep === 1) {
        const isFirstNameValid = await validateField("firstName", formData.firstName);
        const isLastNameValid = await validateField("lastName", formData.lastName);
        const isUserNameValid = await validateField("userName", formData.userName);
        const isEmailValid = await validateField("email", formData.email);

        if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.userName.trim() || !formData.email.trim()) {
          shake();
          toast.warning("Please fill in all fields before continuing.");
          return;
        }

        if (fieldStates.userName === "invalid" || fieldStates.email === "invalid") {
          shake();
          toast.warning("Please fix username or email before continuing.");
          return;
        }

        if (isFirstNameValid && isLastNameValid && isUserNameValid && isEmailValid) {
          setCurrentStep(2);
        } else {
          shake();
          toast.warning("Please fix the errors in Step 1 before continuing.");
        }
      } else if (currentStep === 2) {
        const isPasswordValid = await validateField("password", formData.password);
        const isConfirmPasswordValid = await validateField("confirmPassword", formData.confirmPassword);
        const isSecurityPinValid = await validateField("securityPin", formData.securityPin);
        const isConfirmSecurityPinValid = await validateField("confirmSecurityPin", formData.confirmSecurityPin);

        if (!formData.password || !formData.confirmPassword || !formData.securityPin || !formData.confirmSecurityPin) {
          shake();
          toast.warning("Please fill in all password and PIN fields.");
          return;
        }

        if (isPasswordValid && isConfirmPasswordValid && isSecurityPinValid && isConfirmSecurityPinValid) {
          setCurrentStep(3);
        } else {
          shake();
          toast.warning("Please fix the errors in Step 2 before continuing.");
        }
      }
    } finally {
      setIsNextLoading(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.country || !formData.age || !formData.retirementAge || !formData.phoneNumber) {
      toast.warning("Please fill in all details before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userObj = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        userName: formData.userName.trim().toLowerCase(),
        email: formData.email.trim(),
        country: formData.country,
        age: parseInt(formData.age, 10) || 0,
        retirementAge: parseInt(formData.retirementAge, 10) || 60,
        phoneNumber: formData.phoneNumber.trim(),
        securityPin: formData.securityPin.trim(),
        monthlyIncome: 0,
        fireTarget: 0,
        coinBalance: 50, // Welcome bonus
      };

      const registeredUser = await registerUser(formData.email.trim(), formData.password, userObj);
      console.log("✅ Registration successful:", registeredUser.uid);

      await saveUserSession({
        uid: registeredUser.uid,
        email: formData.email.trim(),
        userName: formData.userName.trim(),
      });

      // Earned moment: welcome them, and go straight in rather than block on a dialog
      celebrate({
        icon: "sparkle",
        title: `Welcome, ${formData.firstName.trim() || "friend"}`,
        message: "Your account is ready. Let's set up your money in a few minutes.",
      });
      navigation.navigate("MainApp", {
        screen: "Calendar",
        params: { screen: "CalendarMain" },
      });
    } catch (err) {
      console.error("❌ Registration Error:", err.code, err.message);
      if (err.code === "auth/email-already-in-use") {
        toast.error("An account with this email already exists.");
      } else {
        toast.error(friendlyError(err, "Something went wrong."), { title: "Registration failed" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicators = () => {
    return (
      <View style={styles.stepsContainer}>
        {[1, 2, 3].map((step) => (
          <View key={step} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                currentStep === step && styles.activeStep,
                currentStep > step && styles.completedStep,
                currentStep < step && styles.inactiveStep,
              ]}
            >
              {currentStep > step ? (
                <Icon name="check" size={16} color={COLORS.textInverse} />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    currentStep === step ? styles.activeStepNumber : styles.inactiveStepNumber,
                  ]}
                >
                  {step}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                currentStep === step ? styles.activeStepLabel : styles.inactiveStepLabel,
              ]}
            >
              {step === 1 ? "Personal" : step === 2 ? "Security" : "Details"}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCountryPicker = () => (
    <PopupModal toastHost={false}
      visible={showCountryPicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCountryPicker(false)}
    >
      <PopupBackdrop component={TouchableOpacity}
        style={styles.countryModalOverlay}
        activeOpacity={1}
        onPress={() => setShowCountryPicker(false)}
      >
        <PopupPanel style={styles.countryModalContent}>
          <View style={styles.countryModalHeader}>
            <Text style={styles.countryModalTitle}>Select Country</Text>
            <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close" onPress={() => setShowCountryPicker(false)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </Press>
          </View>
          <ScrollView style={styles.countryList}>
            {COUNTRIES.map((c) => (
              <Press scaleTo={0.96} activeOpacity={0.7}
                key={c.value}
                style={styles.countryItem}
                onPress={() => {
                  handleChange("country", c.value);
                  setShowCountryPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.countryItemText,
                    formData.country === c.value && styles.selectedCountryText,
                  ]}
                >
                  {c.label}
                </Text>
                {formData.country === c.value && (
                  <Icon name="check" size={18} color={COLORS.primary} />
                )}
              </Press>
            ))}
          </ScrollView>
        </PopupPanel>
      </PopupBackdrop>
      <ToastHost inModal />
    </PopupModal>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>Create Your Account</Text>
            <Text style={styles.stepDescription}>
              Step 1 of 3: Enter your personal information
            </Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Icon name="user" size={18} color={COLORS.textMuted} />
              </View>
              <TextInput
                placeholder="First Name"
                style={styles.input}
                onChangeText={(text) => handleChange("firstName", text)}
                value={formData.firstName}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            {errorMessages.firstName ? (
              <Text style={styles.errorText}>{errorMessages.firstName}</Text>
            ) : null}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Icon name="user" size={18} color={COLORS.textMuted} />
              </View>
              <TextInput
                placeholder="Last Name"
                style={styles.input}
                onChangeText={(text) => handleChange("lastName", text)}
                value={formData.lastName}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            {errorMessages.lastName ? (
              <Text style={styles.errorText}>{errorMessages.lastName}</Text>
            ) : null}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="at-sign" size={18} color={COLORS.textMuted} />
              </View>
              <TextInput
                placeholder="Username"
                style={styles.input}
                onChangeText={(text) => handleChange("userName", text)}
                value={formData.userName}
                autoCapitalize="none"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            {fieldStates.userName === "checking" ? (
              <Text style={styles.checkingText}>Checking availability...</Text>
            ) : fieldStates.userName === "valid" ? (
              <Text style={styles.successText}>{errorMessages.userName}</Text>
            ) : errorMessages.userName ? (
              <Text style={styles.errorText}>{errorMessages.userName}</Text>
            ) : null}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="mail" size={18} color={COLORS.textMuted} />
              </View>
              <TextInput
                placeholder="Email Address"
                style={styles.input}
                onChangeText={(text) => handleChange("email", text)}
                value={formData.email}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            {fieldStates.email === "valid" ? (
              <Text style={styles.successText}>{errorMessages.email}</Text>
            ) : errorMessages.email ? (
              <Text style={styles.errorText}>{errorMessages.email}</Text>
            ) : null}
          </>
        );

      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>Security Setup</Text>
            <Text style={styles.stepDescription}>
              Step 2 of 3: Create a strong password & security PIN
            </Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Icon name="lock" size={18} color={COLORS.textMuted} />
              </View>
              <TextInput
                placeholder="Password"
                secureTextEntry={!showPassword}
                style={styles.input}
                onChangeText={(text) => handleChange("password", text)}
                value={formData.password}
                placeholderTextColor={COLORS.textMuted}
              />
              <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={18}
                  color={COLORS.textMuted}
                />
              </Press>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Icon name="lock" size={18} color={COLORS.textMuted} />
              </View>
              <TextInput
                placeholder="Confirm Password"
                secureTextEntry={!showPassword}
                style={styles.input}
                onChangeText={(text) => handleChange("confirmPassword", text)}
                value={formData.confirmPassword}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            {errorMessages.confirmPassword ? (
              <Text style={styles.errorText}>{errorMessages.confirmPassword}</Text>
            ) : null}

            {/* Password requirements helper */}
            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>Password Requirements:</Text>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={formData.password.length >= 8 ? "check-circle" : "cancel"}
                  size={14}
                  color={formData.password.length >= 8 ? COLORS.success : COLORS.textMuted}
                />
                <Text style={styles.requirementText}>At least 8 characters</Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={/[A-Z]/.test(formData.password) ? "check-circle" : "cancel"}
                  size={14}
                  color={/[A-Z]/.test(formData.password) ? COLORS.success : COLORS.textMuted}
                />
                <Text style={styles.requirementText}>At least one uppercase letter</Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={/[a-z]/.test(formData.password) ? "check-circle" : "cancel"}
                  size={14}
                  color={/[a-z]/.test(formData.password) ? COLORS.success : COLORS.textMuted}
                />
                <Text style={styles.requirementText}>At least one lowercase letter</Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={/\d/.test(formData.password) ? "check-circle" : "cancel"}
                  size={14}
                  color={/\d/.test(formData.password) ? COLORS.success : COLORS.textMuted}
                />
                <Text style={styles.requirementText}>At least one number</Text>
              </View>
              <View style={styles.requirementItem}>
                <MaterialIcons
                  name={/[!@#$%^&*]/.test(formData.password) ? "check-circle" : "cancel"}
                  size={14}
                  color={/[!@#$%^&*]/.test(formData.password) ? COLORS.success : COLORS.textMuted}
                />
                <Text style={styles.requirementText}>At least one special character</Text>
              </View>
            </View>

            {/* Security PIN Section */}
            <Text style={styles.sectionTitle}>Set Security PIN</Text>
            <Text style={styles.sectionDescription}>
              This PIN will be used to reset your password if you forget it
            </Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="shield" size={18} color={COLORS.textMuted} />
              </View>
              <TextInput
                placeholder="Security PIN (4-10 characters)"
                secureTextEntry={!showSecurityPin}
                style={styles.input}
                onChangeText={(text) => handleChange("securityPin", text)}
                value={formData.securityPin}
                placeholderTextColor={COLORS.textMuted}
                maxLength={10}
                keyboardType="default"
              />
              <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={showSecurityPin ? "Hide PIN" : "Show PIN"}
                onPress={() => setShowSecurityPin(!showSecurityPin)}
                style={styles.eyeIcon}
              >
                <Feather
                  name={showSecurityPin ? "eye-off" : "eye"}
                  size={18}
                  color={COLORS.textMuted}
                />
              </Press>
            </View>
            {errorMessages.securityPin ? (
              <Text style={styles.errorText}>{errorMessages.securityPin}</Text>
            ) : null}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="shield" size={18} color={COLORS.textMuted} />
              </View>
              <TextInput
                placeholder="Confirm Security PIN"
                secureTextEntry={!showConfirmSecurityPin}
                style={styles.input}
                onChangeText={(text) => handleChange("confirmSecurityPin", text)}
                value={formData.confirmSecurityPin}
                placeholderTextColor={COLORS.textMuted}
                maxLength={10}
                keyboardType="default"
              />
              <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={showConfirmSecurityPin ? "Hide PIN" : "Show PIN"}
                onPress={() => setShowConfirmSecurityPin(!showConfirmSecurityPin)}
                style={styles.eyeIcon}
              >
                <Feather
                  name={showConfirmSecurityPin ? "eye-off" : "eye"}
                  size={18}
                  color={COLORS.textMuted}
                />
              </Press>
            </View>
            {errorMessages.confirmSecurityPin ? (
              <Text style={styles.errorText}>{errorMessages.confirmSecurityPin}</Text>
            ) : null}

            <View style={styles.pinInfo}>
              <Icon name="info" size={14} color={COLORS.warning} />
              <Text style={styles.pinInfoText}>
                Remember this PIN - you'll need it to reset your password
              </Text>
            </View>
          </>
        );

      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>Just a Few More Details</Text>
            <Text style={styles.stepDescription}>
              Step 3 of 3: Help us personalize your experience
            </Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="calendar" size={18} color={COLORS.textMuted} />
              </View>
              <TextInput
                placeholder="Current Age"
                style={styles.input}
                onChangeText={(text) => handleChange("age", text)}
                value={formData.age}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            {errorMessages.age ? (
              <Text style={styles.errorText}>{errorMessages.age}</Text>
            ) : null}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <MaterialIcons name="emoji-nature" size={18} color={COLORS.textMuted} />
              </View>
              <TextInput
                placeholder="Retirement Age"
                style={styles.input}
                onChangeText={(text) => handleChange("retirementAge", text)}
                value={formData.retirementAge}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            {errorMessages.retirementAge ? (
              <Text style={styles.errorText}>{errorMessages.retirementAge}</Text>
            ) : null}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Feather name="phone" size={18} color={COLORS.textMuted} />
              </View>
              <TextInput
                placeholder="Phone Number"
                style={styles.input}
                onChangeText={(text) => handleChange("phoneNumber", text)}
                value={formData.phoneNumber}
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            {errorMessages.phoneNumber ? (
              <Text style={styles.errorText}>{errorMessages.phoneNumber}</Text>
            ) : null}

            <Press scaleTo={0.96} activeOpacity={0.7}
              style={styles.countryPickerButton}
              onPress={() => setShowCountryPicker(true)}
            >
              <View style={styles.inputIconContainer}>
                <Feather name="globe" size={18} color={COLORS.textMuted} />
              </View>
              <Text
                style={[
                  styles.countryPickerText,
                  !formData.country && styles.countryPickerPlaceholder,
                ]}
              >
                {formData.country || "Select Country"}
              </Text>
              <Feather name="chevron-down" size={18} color={COLORS.textMuted} />
            </Press>
            {errorMessages.country ? (
              <Text style={styles.errorText}>{errorMessages.country}</Text>
            ) : null}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <LigthsOnMark size={isCompact ? 44 : 52} />
            <Text style={styles.brandWord}>LigthsON</Text>
          </View>

          {renderStepIndicators()}

          <Animated.View style={shakeStyle}>
            <Animated.View style={[styles.formContainer, stepSlide]}>{renderStep()}</Animated.View>
          </Animated.View>

          <View style={styles.navigationButtonsContainer}>
            {currentStep > 1 && (
              <Press scaleTo={0.96} activeOpacity={0.7}
                style={styles.backButton}
                onPress={handlePrevStep}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </Press>
            )}

            {currentStep < totalSteps ? (
              <Press scaleTo={0.96} activeOpacity={0.7}
                style={[
                  styles.nextButton,
                  currentStep > 1 && styles.buttonWithMargin,
                  isNextLoading && styles.loadingButton,
                ]}
                onPress={handleNextStep}
                disabled={isNextLoading}
              >
                {isNextLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={P.accInk} />
                    <Text style={[styles.nextButtonText, styles.loadingButtonText]}>
                      Validating...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.nextButtonText}>Continue</Text>
                )}
              </Press>
            ) : (
              <Press scaleTo={0.96} activeOpacity={0.7}
                style={[styles.submitButton, styles.buttonWithMargin]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={P.accInk} />
                    <Text style={styles.submitButtonText}>Creating...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Create Account</Text>
                )}
              </Press>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{" "}
              <Text
                style={styles.loginLink}
                onPress={() => navigation.navigate("Login")}
              >
                Log In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderCountryPicker()}
    </SafeAreaView>
  );
}

const createStyles = (width, height, isCompact) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    container: {
      flexGrow: 1,
      padding: isCompact ? SPACING[16] : SPACING[24],
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginVertical: isCompact ? SPACING[12] : SPACING[20],
    },
    brandWord: { fontSize: 22, fontWeight: "600", letterSpacing: -0.5, color: P.ink },
    logo: {
      width: Math.min(width * 0.45, 180),
      height: isCompact ? 64 : 80,
      resizeMode: "contain",
      alignSelf: "center",
      marginVertical: isCompact ? SPACING[12] : SPACING[20],
    },
    stepsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: isCompact ? SPACING[24] : SPACING[32],
      paddingHorizontal: isCompact ? 0 : SPACING[10],
      position: "relative",
    },
    stepItem: {
      alignItems: "center",
      width: "30%",
      zIndex: 1,
    },
    stepCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: SPACING[8],
    },
    activeStep: {
      backgroundColor: COLORS.primaryFill,
    },
    completedStep: {
      backgroundColor: COLORS.income,
    },
    inactiveStep: {
      backgroundColor: COLORS.skeleton,
    },
    stepNumber: {
      fontSize: isCompact ? 13 : 14,
      fontWeight: "bold",
    },
    activeStepNumber: {
      color: COLORS.textInverse,
    },
    inactiveStepNumber: {
      color: COLORS.textSecondary,
    },
    stepLabel: {
      fontSize: isCompact ? 11 : 12,
      fontWeight: "500",
      textAlign: "center",
    },
    activeStepLabel: {
      color: COLORS.primary,
    },
    inactiveStepLabel: {
      color: COLORS.textSecondary,
    },
    formContainer: {
      width: "100%",
    },
    stepTitle: {
      fontSize: isCompact ? 22 : 24,
      fontWeight: "700",
      color: COLORS.textPrimary,
      marginBottom: SPACING[8],
    },
    stepDescription: {
      fontSize: isCompact ? 14 : 16,
      color: COLORS.textSecondary,
      marginBottom: SPACING[24],
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.surfaceMuted,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.md,
      minHeight: isCompact ? 52 : 56,
      marginBottom: SPACING[16],
    },
    inputIconContainer: {
      padding: SPACING[16],
    },
    input: {
      flex: 1,
      fontSize: isCompact ? 15 : 16,
      color: COLORS.textPrimary,
      height: "100%",
    },
    eyeIcon: {
      padding: SPACING[16],
    },
    errorText: {
      color: COLORS.error,
      fontSize: 14,
      marginTop: -SPACING[8],
      marginLeft: SPACING[16],
      marginBottom: SPACING[16],
    },
    countryPickerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: COLORS.surfaceMuted,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.md,
      minHeight: isCompact ? 52 : 56,
      marginBottom: SPACING[16],
      paddingRight: SPACING[16],
    },
    countryPickerText: {
      flex: 1,
      fontSize: isCompact ? 15 : 16,
      color: COLORS.textPrimary,
    },
    countryPickerPlaceholder: {
      color: COLORS.textMuted,
    },
    countryModalOverlay: {
      flex: 1,
      backgroundColor: COLORS.overlay,
      justifyContent: "flex-end",
    },
    countryModalContent: {
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: RADIUS.lg,
      borderTopRightRadius: RADIUS.lg,
      maxHeight: height * (isCompact ? 0.78 : 0.7),
    },
    countryModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: SPACING[16],
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderLight,
    },
    countryModalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: COLORS.textPrimary,
    },
    countryList: {
      padding: SPACING[16],
    },
    countryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: SPACING[12],
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderLight,
    },
    countryItemText: {
      fontSize: 16,
      color: COLORS.textPrimary,
    },
    selectedCountryText: {
      color: COLORS.primary,
      fontWeight: "600",
    },
    passwordRequirements: {
      backgroundColor: COLORS.surfaceMuted,
      borderRadius: RADIUS.md,
      padding: SPACING[16],
      marginBottom: SPACING[24],
    },
    requirementsTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: COLORS.textPrimary,
      marginBottom: SPACING[12],
    },
    requirementItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: SPACING[8],
    },
    requirementText: {
      fontSize: 14,
      color: COLORS.textSecondary,
      marginLeft: SPACING[8],
    },
    navigationButtonsContainer: {
      marginTop: SPACING[24],
      flexDirection: "row",
    },
    backButton: {
      flex: 1,
      backgroundColor: COLORS.surfaceMuted,
      borderRadius: RADIUS.md,
      minHeight: isCompact ? 52 : 56,
      alignItems: "center",
      justifyContent: "center",
    },
    backButtonText: {
      color: COLORS.textSecondary,
      fontSize: isCompact ? 15 : 16,
      fontWeight: "600",
    },
    nextButton: {
      flex: 1,
      backgroundColor: P.acc,
      borderRadius: RADIUS.md,
      minHeight: isCompact ? 52 : 56,
      alignItems: "center",
      justifyContent: "center",
      ...SHADOWS.md,
    },
    buttonWithMargin: {
      marginLeft: SPACING[12], color: P.accInk,
  },
    nextButtonText: {
      color: P.accInk,
      fontSize: isCompact ? 15 : 16,
      fontWeight: "700",
    },
    submitButton: {
      flex: 1,
      backgroundColor: P.acc,
      borderRadius: RADIUS.md,
      minHeight: isCompact ? 52 : 56,
      alignItems: "center",
      justifyContent: "center",
      ...SHADOWS.md,
    },
    submitButtonText: {
      color: P.accInk,
      fontSize: isCompact ? 15 : 16,
      fontWeight: "700",
    },
    footer: {
      marginTop: SPACING[24],
      marginBottom: SPACING[24],
      alignItems: "center",
    },
    footerText: {
      fontSize: isCompact ? 14 : 15,
      color: COLORS.textSecondary,
    },
    loginLink: {
      color: COLORS.textLink,
      fontWeight: "700",
    },
    loadingButton: {
      opacity: 0.9, color: P.accInk,
  },
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center", color: P.accInk,
  },
    loadingButtonText: {
      marginLeft: SPACING[8], color: P.accInk,
  },
    checkingText: {
      color: COLORS.primary,
      fontSize: 14,
      marginTop: -SPACING[8],
      marginLeft: SPACING[16],
      marginBottom: SPACING[16],
    },
    successText: {
      color: COLORS.success,
      fontSize: 14,
      marginTop: -SPACING[8],
      marginLeft: SPACING[16],
      marginBottom: SPACING[16],
      fontWeight: "600",
    },
    sectionTitle: {
      fontSize: isCompact ? 17 : 18,
      fontWeight: "600",
      color: COLORS.textPrimary,
      marginTop: SPACING[24],
      marginBottom: SPACING[8],
    },
    sectionDescription: {
      fontSize: isCompact ? 13 : 14,
      color: COLORS.textSecondary,
      marginBottom: SPACING[16],
      lineHeight: 20,
    },
    pinInfo: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.warningSoft,
      padding: SPACING[12],
      borderRadius: RADIUS.sm,
      marginTop: SPACING[8],
    },
    pinInfoText: {
      fontSize: isCompact ? 11 : 12,
      color: COLORS.warning,
      marginLeft: SPACING[8],
      flex: 1,
    },
  });
