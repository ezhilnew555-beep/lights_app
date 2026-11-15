/**
 * VoiceAgentAddonWidget.js
 * ─────────────────────────────────────────────────────────────────────
 * Premium Voice-Enabled AI Transaction Agent Interface for LigthsON.
 *
 * Implements the "Warm Precision" design system with:
 * • Radiant Floating Action Button (FAB) with luminous breathing aura
 * • Frosted glassmorphic bottom-sheet modal with spring physics
 * • Symmetrical 24-bar audio frequency equalizer & concentric mic ripple
 * • Dual-mode interaction (Hands-free Voice & Keyboard Text)
 * • Dynamic transaction confirmation cards with type-specific styling
 * • Interactive quick-response category & amount suggestion chips
 * • Accessibility enhancements: TTS speaker mute toggle & high-contrast labels
 * • Automatic language detection & multi-turn conversational follow-ups
 * ─────────────────────────────────────────────────────────────────────
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  ActivityIndicator,
  Vibration,
  Pressable,
} from "react-native";
import { Text, TextInput } from "./pulse/Text";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import Speech from "../utils/safeSpeech";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { auth } from "../config/FirebaseConfig";
import {
  checkHealth,
  processAudioConversation,
  processTextConversation,
  confirmTransaction,
} from "../services/voiceAgentService";
import { Button as PulseButton, Icon as PulseIcon, Icon, ClockLoader, Press } from "./pulse";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ANIMATION, P, themedStyles } from "../theme/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOTTOM_TAB_HEIGHT = Platform.OS === "ios" ? 85 : 72;
const FAB_SIZE = 60;
const FAB_RIGHT = 20;
const FAB_BOTTOM = BOTTOM_TAB_HEIGHT + 16;

// ── Language Options ────────────────────────────────────────────────
const LANGUAGES = [
  { code: "auto", label: "Auto", flag: "🌐" },
  { code: "en-IN", label: "English", flag: "🇬🇧" },
  { code: "ta-IN", label: "தமிழ்", flag: "🇮🇳" },
  { code: "hi-IN", label: "हिन्दी", flag: "🇮🇳" },
];

// ── Interaction Modes ───────────────────────────────────────────────
const MODE = {
  IDLE: "idle",
  LISTENING: "listening",
  PROCESSING: "processing",
  PREVIEW: "preview",
  FOLLOW_UP: "follow_up",
  QUERY_RESULT: "query_result",
  ERROR: "error",
};

// ── Quick Suggestion Prompts ────────────────────────────────────────
const QUICK_PROMPTS = [
  { text: "Spent ₹350 on groceries", type: "expense", icon: "cart-outline" },
  { text: "Add ₹45,000 salary", type: "income", icon: "cash-plus" },
  { text: "Invested ₹5,000 in SIP", type: "investment", icon: "chart-timeline-variant" },
  { text: "Spent ₹180 on coffee & snacks", type: "expense", icon: "coffee-outline" },
  { text: "Paid ₹1,200 electricity bill", type: "expense", icon: "flash-outline" },
  { text: "What is my total spend?", type: "query", icon: "help-circle-outline" },
];

// ── Common Category Suggestion Chips for Clarifications ──────────────
const POPULAR_CATEGORIES = [
  "Groceries",
  "Food & Dining",
  "Transport",
  "Shopping",
  "Utilities",
  "Healthcare",
  "Salary",
  "Mutual Fund SIP",
];

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2000, 5000];

const VoiceAgentAddonWidget = forwardRef(function VoiceAgentAddonWidget(
  { hideFab = false, onOpen, onClose },
  ref
) {
  // ── State ───────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState(MODE.IDLE);
  const [isTextMode, setIsTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [language, setLanguage] = useState("auto");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // TTS Mute toggle for privacy

  // Recording
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // API results
  const [apiResult, setApiResult] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [spokenResponse, setSpokenResponse] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [queryAnswer, setQueryAnswer] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionId, setSessionId] = useState(null);

  // Connection
  const [isOnline, setIsOnline] = useState(true);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Animations
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabPulse = useRef(new Animated.Value(1)).current;
  const micRipple = useRef(new Animated.Value(1)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const coinScaleAnim = useRef(new Animated.Value(0)).current;

  // 24 Equalizer waveform bars
  const waveformBars = useRef(
    Array.from({ length: 24 }, () => new Animated.Value(0.18))
  ).current;

  // Refs
  const recordingRef = useRef(null);
  const durationIntervalRef = useRef(null);

  // ── Imperative Ref Handle ───────────────────────────────────────
  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => closeSheet(),
    isOpen: () => isOpen,
  }));

  // ── Lifecycle ──────────────────────────────────────────────────
  useEffect(() => {
    startFabPulse();
    performHealthCheck();
    return () => {
      stopRecording(true);
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      openSheet();
      if (onOpen) onOpen();
    }
  }, [isOpen]);

  // ── Health Check ───────────────────────────────────────────────
  const performHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const result = await checkHealth();
      setIsOnline(result.success && result.status === "online");
    } catch {
      setIsOnline(true); // Graceful fallback
    }
    setIsCheckingHealth(false);
  };

  // ── Animated Effects ──────────────────────────────────────────
  const startFabPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fabPulse, {
          toValue: 1.18,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(fabPulse, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startMicRipple = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(micRipple, {
          toValue: 1.35,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(micRipple, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopMicRipple = () => {
    micRipple.stopAnimation();
    micRipple.setValue(1);
  };

  const animateWaveform = () => {
    waveformBars.forEach((bar, idx) => {
      const multiplier = Math.sin((idx / waveformBars.length) * Math.PI);
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: Math.min(1, Math.random() * 0.7 * multiplier + 0.3),
            duration: 120 + Math.random() * 140,
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.15,
            duration: 120 + Math.random() * 140,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const stopWaveform = () => {
    waveformBars.forEach((bar) => {
      bar.stopAnimation();
      Animated.timing(bar, {
        toValue: 0.18,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const openSheet = () => {
    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: 1,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 250,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSheet = () => {
    Speech.stop();
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(contentFade, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOpen(false);
      resetState();
      if (onClose) onClose();
    });
  };

  const resetState = () => {
    setMode(MODE.IDLE);
    setApiResult(null);
    setParsedData(null);
    setSpokenResponse("");
    setFollowUpQuestion("");
    setQueryAnswer("");
    setErrorMessage("");
    setTextInput("");
    setIsTextMode(false);
    setRecordingDuration(0);
    stopWaveform();
    stopMicRipple();
  };

  const isPreparingRef = useRef(false);
  const isStoppingRef = useRef(false);

  // ── Audio Recording ───────────────────────────────────────────
  const startRecording = async () => {
    if (isPreparingRef.current || isRecording) return;
    isPreparingRef.current = true;

    try {
      // 1. Force unload any previous recording if still hanging in native audio engine
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (_) {}
        recordingRef.current = null;
      }

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setErrorMessage("Microphone permission is required for voice input.");
        setMode(MODE.ERROR);
        isPreparingRef.current = false;
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = newRecording;
      setRecording(newRecording);
      setIsRecording(true);
      setMode(MODE.LISTENING);
      setRecordingDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      animateWaveform();
      startMicRipple();
      if (Platform.OS !== "web") Vibration.vibrate(40);
    } catch (err) {
      console.error("Failed to start recording:", err);
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (_) {}
        recordingRef.current = null;
      }
      setIsRecording(false);
      setErrorMessage("Could not start microphone. Please try again.");
      setMode(MODE.ERROR);
    } finally {
      isPreparingRef.current = false;
    }
  };

  const stopRecording = async (isCleanup = false) => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    stopWaveform();
    stopMicRipple();

    // Wait briefly if startRecording is still in progress
    let attempts = 0;
    while (isPreparingRef.current && attempts < 10) {
      await new Promise((r) => setTimeout(r, 50));
      attempts++;
    }

    if (isStoppingRef.current) return null;
    isStoppingRef.current = true;

    const currentRecording = recordingRef.current;
    if (!currentRecording) {
      setIsRecording(false);
      isStoppingRef.current = false;
      return null;
    }

    try {
      await currentRecording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = currentRecording.getURI();
      recordingRef.current = null;
      setRecording(null);
      setIsRecording(false);

      if (isCleanup || !uri) {
        isStoppingRef.current = false;
        return null;
      }

      if (Platform.OS !== "web") Vibration.vibrate(25);

      setMode(MODE.PROCESSING);
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType?.Base64 || "base64",
      });

      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch (_) {}

      isStoppingRef.current = false;
      return base64Audio;
    } catch (err) {
      console.error("Failed to stop recording:", err);
      recordingRef.current = null;
      setRecording(null);
      setIsRecording(false);
      isStoppingRef.current = false;
      return null;
    }
  };

  // ── Process Audio & Text ──────────────────────────────────────
  const handleVoiceSubmit = async () => {
    const base64Audio = await stopRecording();
    if (!base64Audio) {
      setMode(MODE.IDLE);
      return;
    }

    const userId = auth.currentUser?.uid || "default_user";

    try {
      const result = await processAudioConversation(base64Audio, userId, language);
      handleApiResponse(result);
    } catch (err) {
      setErrorMessage("Failed to process speech. Please check connection.");
      setMode(MODE.ERROR);
    }
  };

  const handleTextSubmit = async (customPrompt = null) => {
    const textToSend = typeof customPrompt === "string" ? customPrompt : textInput.trim();
    if (!textToSend) return;

    Keyboard.dismiss();
    setMode(MODE.PROCESSING);
    const userId = auth.currentUser?.uid || "default_user";

    try {
      const result = await processTextConversation(textToSend, userId, language, sessionId);
      setTextInput("");
      handleApiResponse(result);
    } catch (err) {
      setErrorMessage("Failed to process text command. Please try again.");
      setMode(MODE.ERROR);
    }
  };

  // ── Handle Response ───────────────────────────────────────────
  const handleApiResponse = (result) => {
    setApiResult(result);

    if (!result || result.success === false) {
      setErrorMessage(result?.error || "Could not understand speech. Please try again.");
      setMode(MODE.ERROR);
      return;
    }

    if (result.sessionId) setSessionId(result.sessionId);

    const spoken = result.spokenResponse || result.confirmation_spoken || "";
    setSpokenResponse(spoken);

    // Query result
    if (result.action_performed === "query") {
      setQueryAnswer(spoken);
      setMode(MODE.QUERY_RESULT);
      speakResponse(spoken);
      return;
    }

    // Clarification needed
    if (result.requires_clarification || result.action_performed === "clarification_needed") {
      setFollowUpQuestion(result.follow_up_question || spoken);
      setParsedData(result.parsedData || result.partial_parsed || null);
      setMode(MODE.FOLLOW_UP);
      speakResponse(result.follow_up_question || spoken);
      return;
    }

    // Success transaction preview
    const txData = result.parsedData || {
      transaction_type: result.transaction_type,
      amount: result.amount,
      category: result.category,
      date: result.date,
      notes: result.notes,
      confidence: result.confidence,
    };
    setParsedData(txData);
    setMode(MODE.PREVIEW);
    speakResponse(spoken);

    // Coins animation
    triggerCoinsReward(txData);
  };

  // ── Confirm Transaction Action ────────────────────────────────
  const handleConfirmAndSave = async () => {
    if (!parsedData) return;
    const userId = auth.currentUser?.uid || "default_user";
    try {
      setMode(MODE.PROCESSING);
      await confirmTransaction(parsedData, userId, "create");
      if (Platform.OS !== "web") Vibration.vibrate([0, 40, 60, 40]);
      closeSheet();
    } catch (err) {
      setErrorMessage("Failed to confirm transaction.");
      setMode(MODE.ERROR);
    }
  };

  // ── Text-to-Speech (With Mute Check) ─────────────────────────
  const speakResponse = (text) => {
    if (!text || isMuted) return;

    const langMap = {
      "en-IN": "en-IN",
      "ta-IN": "ta-IN",
      "hi-IN": "hi-IN",
      auto: "en-IN",
    };

    try {
      Speech.stop();
      Speech.speak(text, {
        language: langMap[language] || "en-IN",
        pitch: 1.0,
        rate: 0.95,
      });
    } catch (err) {
      console.warn("TTS playback:", err.message);
    }
  };

  // ── Gamification Coins ────────────────────────────────────────
  const triggerCoinsReward = async (txData) => {
    try {
      Animated.sequence([
        Animated.spring(coinScaleAnim, { toValue: 1.2, useNativeDriver: true }),
        Animated.spring(coinScaleAnim, { toValue: 1, useNativeDriver: true }),
      ]).start();

      // Coins are granted by the server when the confirmed transaction is saved,
      // never at preview time.
    } catch (err) {
      console.warn("Coin bonus skipped:", err.message);
    }
  };

  // ── UI Helpers ────────────────────────────────────────────────
  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case "income":
        return {
          color: COLORS.income,
          softBg: COLORS.incomeSoft,
          label: "Income",
          icon: "arrow-down-left",
        };
      case "investment":
        return {
          color: COLORS.indigo,
          softBg: COLORS.indigoSoft,
          label: "Investment",
          icon: "trending-up",
        };
      default:
        return {
          color: COLORS.expense,
          softBg: COLORS.expenseSoft,
          label: "Expense",
          icon: "arrow-up-right",
        };
    }
  };

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  // ═══════════════════════════════════════════════════════════════
  // RENDER SUB-VIEWS
  // ═══════════════════════════════════════════════════════════════

  // 1. Header Bar with Mute & Language
  const renderHeader = () => (
    <View style={styles.headerBar}>
      <View style={styles.headerLeft}>
        <View style={[styles.statusIndicator, isOnline ? styles.onlineDot : styles.offlineDot]} />
        <Text style={styles.headerTitle}>LigthsON AI</Text>
        <View style={styles.modelBadge}>
          <Text style={styles.modelBadgeText}>Voice Agent</Text>
        </View>
      </View>

      <View style={styles.headerRight}>
        {/* Speaker Mute Toggle */}
        <Press scaleTo={0.96} activeOpacity={0.7}
          style={[styles.iconButton, isMuted && styles.iconButtonMuted]}
          onPress={() => {
            if (!isMuted) Speech.stop();
            setIsMuted(!isMuted);
          }}
          accessibilityLabel={isMuted ? "Unmute Voice Responses" : "Mute Voice Responses"}
          accessibilityRole="button"
        >
          <Feather
            name={isMuted ? "volume-x" : "volume-2"}
            size={18}
            color={isMuted ? COLORS.expense : COLORS.textSecondary}
          />
        </Press>

        {/* Language Selector Dropdown Button */}
        <Press scaleTo={0.96}
          style={styles.langSelector}
          onPress={() => setShowLangPicker(!showLangPicker)}
          activeOpacity={0.75}
          accessibilityLabel="Change language"
          accessibilityRole="button"
        >
          <Text style={styles.langFlagText}>{currentLang.flag}</Text>
          <Text style={styles.langCodeText}>{currentLang.label}</Text>
          <Icon name="chevronDown" size={12} color={COLORS.textSecondary} />
        </Press>

        {/* Close Button */}
        <Press scaleTo={0.96} activeOpacity={0.7}
          style={styles.closeButton}
          onPress={closeSheet}
          accessibilityLabel="Close voice assistant"
          accessibilityRole="button"
        >
          <Icon name="close" size={20} color={COLORS.textSecondary} />
        </Press>
      </View>
    </View>
  );

  // 2. Language Picker Popover
  const renderLanguagePicker = () => {
    if (!showLangPicker) return null;
    return (
      <View style={styles.langDropdown}>
        {LANGUAGES.map((item) => (
          <Press scaleTo={0.96} activeOpacity={0.7}
            key={item.code}
            style={[
              styles.langOptionItem,
              language === item.code && styles.langOptionActive,
            ]}
            onPress={() => {
              setLanguage(item.code);
              setShowLangPicker(false);
            }}
          >
            <Text style={styles.langOptionFlag}>{item.flag}</Text>
            <Text
              style={[
                styles.langOptionText,
                language === item.code && styles.langOptionTextActive,
              ]}
            >
              {item.label}
            </Text>
            {language === item.code && (
              <Icon name="check" size={16} color={COLORS.primary} />
            )}
          </Press>
        ))}
      </View>
    );
  };

  // 3. Idle / Ready View with Quick Prompts
  const renderIdleView = () => (
    <View style={styles.idleView}>
      <View style={styles.aiOrbContainer}>
        <View style={styles.pRingOuter} />
        <View style={styles.pRingInner} />
        <Press scaleTo={0.96}
          style={styles.pOrb}
          onPress={startRecording}
          activeOpacity={0.85}
          accessibilityLabel="Start listening"
          accessibilityRole="button"
        >
          <PulseIcon name="mic" size={36} color={P.accInk} strokeWidth={2} />
        </Press>
      </View>

      <Text style={styles.heroGreeting}>
        {language === "ta-IN"
          ? "நான் உங்களுக்கு எப்படி உதவ முடியும்?"
          : language === "hi-IN"
          ? "मैं आपकी कैसे सहायता कर सकता हूँ?"
          : "What would you like to log today?"}
      </Text>
      <Text style={styles.heroSubtitle}>
        Speak naturally in English, Tamil (Tanglish), or Hindi (Hinglish)
      </Text>

      {/* Interactive Quick Prompt Chips */}
      <Text mono style={styles.quickPromptsHeader}>TRY SAYING</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.promptScrollContent}
      >
        {QUICK_PROMPTS.map((prompt, index) => (
          <Press scaleTo={0.96}
            key={index}
            style={styles.promptChip}
            onPress={() => handleTextSubmit(prompt.text)}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name={prompt.icon}
              size={15}
              color={COLORS.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.promptChipText}>{prompt.text}</Text>
          </Press>
        ))}
      </ScrollView>
    </View>
  );

  // 4. Active Listening Visualizer
  const renderListeningView = () => (
    <View style={styles.listeningContainer}>
      <View style={styles.durationBadge}>
        <View style={styles.pulsingRedDot} />
        <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
      </View>

      {/* Symmetrical Equalizer Waveform */}
      <View style={styles.waveformContainer}>
        {waveformBars.map((barAnim, index) => {
          const isCenter = Math.abs(index - 12) < 5;
          return (
            <Animated.View
              key={index}
              style={[
                styles.waveformBar,
                {
                  backgroundColor: isCenter ? P.acc : P.line,
                  transform: [{ scaleY: barAnim }],
                },
              ]}
            />
          );
        })}
      </View>

      <Text mono style={styles.listeningHint}>● LISTENING · TAP TO FINISH</Text>
    </View>
  );

  // 5. Processing Shimmer State
  const renderProcessingView = () => (
    <View style={styles.processingContainer}>
      <ClockLoader />
      <Text style={styles.processingTitle}>Analyzing Financial Command...</Text>
      <Text style={styles.processingSub}>Extracting amount, category, and date via AI</Text>
    </View>
  );

  // 6. Transaction Preview Card (Confirmation State) — Pulse "parsed by AI" block
  const renderPreviewCard = () => {
    if (!parsedData) return null;
    const typeInfo = getTypeStyle(parsedData.transaction_type);
    const rows = [
      ["type", `"${String(typeInfo.label || parsedData.transaction_type || "expense").toLowerCase()}"`, typeInfo.color],
      ["category", `"${parsedData.category || "General"}"`, P.accTx],
      ["amount", Number(parsedData.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }), P.ink],
      ["date", `"${parsedData.date || "today"}"`, P.ink],
    ];
    if (parsedData.payment_method || parsedData.method)
      rows.push(["method", `"${parsedData.payment_method || parsedData.method}"`, P.ink]);
    if (parsedData.notes) rows.push(["notes", `"${parsedData.notes}"`, P.ink2]);

    return (
      <View style={styles.cardContainer}>
        <View style={styles.pParsedCard}>
          <View style={styles.pParsedHead}>
            <Text mono style={styles.pParsedComment}>// parsed by AI</Text>
            <Text mono style={styles.pParsedComment}>
              {Math.round((parsedData.confidence || 0.95) * 100)}% match
            </Text>
          </View>
          {rows.map(([k, v, c]) => (
            <View key={k} style={styles.pParsedRow}>
              <Text mono style={styles.pParsedKey}>{k}</Text>
              <Text mono style={[styles.pParsedVal, { color: c }]} numberOfLines={2}>
                {v}
              </Text>
            </View>
          ))}
        </View>

        <Animated.View style={{ transform: [{ scale: coinScaleAnim }] }}>
          <PulseButton title="Confirm & log · +5 coins" icon="check" onPress={handleConfirmAndSave} />
        </Animated.View>
        <PulseButton title="Try again" variant="ghost" onPress={resetState} style={{ marginTop: 10 }} />
      </View>
    );
  };

  // 7. Conversational Follow-Up / Clarification View
  const renderFollowUpView = () => (
    <View style={styles.followUpContainer}>
      <View style={styles.speechBubble}>
        <View style={styles.avatarBubble}>
          <MaterialCommunityIcons name="robot" size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.speechBubbleText}>{followUpQuestion || spokenResponse}</Text>
      </View>

      <Text style={styles.quickAnswerTitle}>Quick select category:</Text>
      <View style={styles.chipsWrap}>
        {POPULAR_CATEGORIES.map((cat) => (
          <Press scaleTo={0.96} activeOpacity={0.7}
            key={cat}
            style={styles.categoryChip}
            onPress={() => handleTextSubmit(cat)}
          >
            <Text style={styles.categoryChipText}>{cat}</Text>
          </Press>
        ))}
      </View>

      <Text style={styles.quickAnswerTitle}>Or select amount:</Text>
      <View style={styles.chipsWrap}>
        {QUICK_AMOUNTS.map((amt) => (
          <Press scaleTo={0.96} activeOpacity={0.7}
            key={amt}
            style={styles.amountChip}
            onPress={() => handleTextSubmit(`₹${amt}`)}
          >
            <Text style={styles.amountChipText}>₹{amt}</Text>
          </Press>
        ))}
      </View>
    </View>
  );

  // 8. Query / RAG Result View
  const renderQueryResultView = () => (
    <View style={styles.queryResultContainer}>
      <View style={styles.queryIconBadge}>
        <MaterialCommunityIcons name="chart-box-outline" size={32} color={COLORS.primary} />
      </View>
      <Text style={styles.queryAnswerText}>{queryAnswer}</Text>

      <Press scaleTo={0.96} activeOpacity={0.7} style={styles.doneQueryButton} onPress={resetState}>
        <Text style={styles.doneQueryButtonText}>Done</Text>
      </Press>
    </View>
  );

  // 9. Error View with Retry
  const renderErrorView = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={42} color={COLORS.expense} />
      <Text style={styles.errorTitle}>Could not complete request</Text>
      <Text style={styles.errorMessage}>{errorMessage}</Text>

      <Press scaleTo={0.96} activeOpacity={0.7} style={styles.retryButton} onPress={resetState}>
        <Icon name="refresh" size={16} color={P.onSolid} style={{ marginRight: 6 }} />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </Press>
    </View>
  );

  // ── Bottom Control Bar (Mic + Text Input) ──────────────────────
  const renderBottomControls = () => (
    <View style={styles.bottomControlBar}>
      {isTextMode ? (
        // Text Input Bar
        <View style={styles.textInputRow}>
          <TextInput
            style={styles.inlineTextInput}
            placeholder="Type a transaction (e.g. 400 on petrol)..."
            placeholderTextColor={COLORS.textMuted}
            value={textInput}
            onChangeText={setTextInput}
            onSubmitEditing={() => handleTextSubmit()}
            returnKeyType="send"
            autoFocus
          />
          <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Send"
            style={[styles.sendTextButton, !textInput.trim() && styles.sendTextButtonDisabled]}
            onPress={() => handleTextSubmit()}
            disabled={!textInput.trim()}
          >
            <Ionicons name="arrow-up" size={18} color={P.accInk} />
          </Press>
          <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Record voice"
            style={styles.switchModeButton}
            onPress={() => setIsTextMode(false)}
          >
            <Icon name="mic" size={20} color={COLORS.textSecondary} />
          </Press>
        </View>
      ) : (
        // Voice Mic Control
        <View style={styles.voiceControlRow}>
          <Press scaleTo={0.96} activeOpacity={0.7}
            style={styles.keyboardModeToggle}
            onPress={() => setIsTextMode(true)}
            accessibilityLabel="Switch to keyboard text mode"
            accessibilityRole="button"
          >
            <Ionicons name="keypad-outline" size={22} color={COLORS.textSecondary} />
          </Press>

          {/* Central Animated Mic Button */}
          <View style={styles.centerMicWrapper}>
            {isRecording && (
              <Animated.View
                style={[
                  styles.micRippleRing,
                  {
                    transform: [{ scale: micRipple }],
                  },
                ]}
              />
            )}
            <Press scaleTo={0.96}
              activeOpacity={0.85}
              style={[styles.mainMicButton, isRecording && styles.mainMicButtonActive]}
              onPress={() => {
                if (isRecording) {
                  handleVoiceSubmit();
                } else {
                  startRecording();
                }
              }}
              accessibilityLabel={isRecording ? "Tap to stop and send speech" : "Tap to record speech"}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={isRecording ? [P.neg, P.neg] : [P.acc, P.acc]}
                style={styles.mainMicGradient}
              >
                <Ionicons name={isRecording ? "stop" : "mic"} size={30} color={isRecording ? P.onSolid : P.accInk} />
              </LinearGradient>
            </Press>
          </View>

          <Press scaleTo={0.96} activeOpacity={0.7}
            style={styles.keyboardModeToggle}
            onPress={performHealthCheck}
            accessibilityLabel="Refresh status"
            accessibilityRole="button"
          >
            <Ionicons name="wifi-outline" size={20} color={isOnline ? COLORS.income : COLORS.expense} />
          </Press>
        </View>
      )}
    </View>
  );

  // ═══════════════════════════════════════════════════════════════
  // MAIN COMPONENT RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <>
      {/* ── 1. Radiant Floating Action Button (FAB) ── */}
      {!hideFab && !isOpen && (
        <Animated.View
          style={[
            styles.fabContainer,
            {
              transform: [{ scale: fabPulse }],
            },
          ]}
        >
          {/* Luminous Outer Glow Ring */}
          <View style={styles.fabGlowRing} />

          <Press scaleTo={0.96}
            activeOpacity={0.85}
            style={styles.fabButton}
            onPress={() => setIsOpen(true)}
            accessibilityLabel="Open LigthsON Voice AI Assistant"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[P.solid, P.solid, P.solid]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Icon name="mic" size={26} color={P.onSolid} />
              <View style={[styles.fabOnlineDot, isOnline ? styles.onlineDot : styles.offlineDot]} />
            </LinearGradient>
          </Press>
        </Animated.View>
      )}

      {/* ── 2. Modal Overlay & Bottom Sheet ── */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          {/* Backdrop blur click to close */}
          <Pressable style={styles.backdropDismiss} onPress={closeSheet} />

          <Animated.View
            style={[
              styles.sheetContainer,
              {
                transform: [
                  {
                    translateY: sheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SCREEN_HEIGHT * 0.7, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            {renderHeader()}
            {renderLanguagePicker()}

            {/* Scrollable Content Body */}
            <ScrollView
              contentContainerStyle={styles.sheetBodyScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {mode === MODE.IDLE && renderIdleView()}
              {mode === MODE.LISTENING && renderListeningView()}
              {mode === MODE.PROCESSING && renderProcessingView()}
              {mode === MODE.PREVIEW && renderPreviewCard()}
              {mode === MODE.FOLLOW_UP && renderFollowUpView()}
              {mode === MODE.QUERY_RESULT && renderQueryResultView()}
              {mode === MODE.ERROR && renderErrorView()}
            </ScrollView>

            {/* Bottom Controls */}
            {renderBottomControls()}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
});

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = themedStyles(() => StyleSheet.create({
  // ── Pulse voice ──
  pRingOuter: { position: "absolute", width: 168, height: 168, borderRadius: 84, borderWidth: 1, borderColor: P.line },
  pRingInner: { position: "absolute", width: 132, height: 132, borderRadius: 66, borderWidth: 2, borderColor: P.acc, opacity: 0.5 },
  pOrb: { width: 96, height: 96, borderRadius: 48, backgroundColor: P.acc, alignItems: "center", justifyContent: "center" },
  pParsedCard: { backgroundColor: P.surf, borderWidth: 1, borderColor: P.line, borderRadius: 14, padding: 16, gap: 8, marginBottom: 14 },
  pParsedHead: { flexDirection: "row", justifyContent: "space-between" },
  pParsedComment: { fontSize: 13, color: P.mute },
  pParsedRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  pParsedKey: { fontSize: 13, color: P.ink2 },
  pParsedVal: { fontSize: 13, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  // ── FAB ──────────────────────────────────────────────────────
  fabContainer: {
    position: "absolute",
    right: FAB_RIGHT,
    bottom: FAB_BOTTOM,
    width: FAB_SIZE,
    height: FAB_SIZE,
    zIndex: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  fabGlowRing: {
    position: "absolute",
    width: FAB_SIZE + 16,
    height: FAB_SIZE + 16,
    borderRadius: (FAB_SIZE + 16) / 2,
    backgroundColor: "rgba(20, 184, 166, 0.22)",
  },
  fabButton: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    ...SHADOWS.lg,
    overflow: "hidden",
  },
  fabGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fabOnlineDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: P.line,
  },
  onlineDot: {
    backgroundColor: P.pos,
  },
  offlineDot: {
    backgroundColor: P.neg,
  },

  // ── Modal Sheet ──────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  backdropDismiss: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: P.bg,
    borderTopLeftRadius: RADIUS["2xl"],
    borderTopRightRadius: RADIUS["2xl"],
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    ...SHADOWS.lg, elevation: 0, shadowOpacity: 0, borderWidth: 1, borderColor: P.line,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },

  // ── Header Bar ───────────────────────────────────────────────
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING[16],
    paddingVertical: SPACING[10],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  modelBadge: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  modelBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
    textTransform: "uppercase",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonMuted: {
    backgroundColor: COLORS.expenseSoft,
  },
  langSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  langFlagText: {
    fontSize: 13,
  },
  langCodeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Language Dropdown ────────────────────────────────────────
  langDropdown: {
    position: "absolute",
    top: 60,
    right: 50,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 6,
    zIndex: 100,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 130,
  },
  langOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    gap: 8,
  },
  langOptionActive: {
    backgroundColor: COLORS.primarySoft,
  },
  langOptionFlag: {
    fontSize: 14,
  },
  langOptionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  langOptionTextActive: {
    fontWeight: "700",
    color: COLORS.primary,
  },

  // ── Sheet Body ───────────────────────────────────────────────
  sheetBodyScroll: {
    paddingHorizontal: SPACING[16],
    paddingVertical: SPACING[16],
  },

  // ── Idle View ────────────────────────────────────────────────
  idleView: {
    alignItems: "center",
  },
  aiOrbContainer: {
    width: 168,
    height: 168,
    borderRadius: 40,
    padding: 3,
    marginBottom: 14,
    ...SHADOWS.sm, alignItems: "center", justifyContent: "center",
  },
  aiOrbGradient: {
    flex: 1,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  heroGreeting: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 18,
    paddingHorizontal: 16,
  },
  quickPromptsHeader: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "700",
    color: P.mute,
    textTransform: "uppercase",
    letterSpacing: 0.66,
    marginBottom: 8,
  },
  promptScrollContent: {
    gap: 8,
    paddingBottom: 4,
  },
  promptChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  promptChipText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },

  // ── Listening View ───────────────────────────────────────────
  listeningContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(225, 29, 72, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    marginBottom: 24,
    gap: 6,
  },
  pulsingRedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.expense,
  },
  durationText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.expense,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    width: "100%",
    gap: 4,
    marginBottom: 20,
  },
  waveformBar: {
    width: 4,
    height: 50,
    borderRadius: 2,
  },
  listeningHint: {
    fontSize: 12,
    fontWeight: "500",
    color: P.accTx, letterSpacing: 0.7,
  },

  // ── Processing View ──────────────────────────────────────────
  processingContainer: {
    alignItems: "center",
    paddingVertical: 36,
  },
  processingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  processingSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // ── Transaction Preview Card ─────────────────────────────────
  cardContainer: {
    width: "100%",
  },
  previewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING[16],
    borderWidth: 2,
    ...SHADOWS.md,
    marginBottom: 16, elevation: 0, shadowOpacity: 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  amountDisplayRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginVertical: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginRight: 4,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  metaDetailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
    marginTop: 6,
  },
  metaItem: {
    alignItems: "center",
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  categoryPill: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  notesContainer: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
  notesLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  notesText: {
    fontSize: 13,
    fontStyle: "italic",
    color: COLORS.textSecondary,
  },
  coinBonusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.amberSoft,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    marginTop: 14,
    gap: 6,
  },
  coinBonusText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.amber,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  confirmButton: {
    flex: 2,
    height: 48,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    ...SHADOWS.sm,
  },
  confirmButtonGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: P.onSolid,
  },

  // ── Follow-Up / Clarification ────────────────────────────────
  followUpContainer: {
    width: "100%",
  },
  speechBubble: {
    flexDirection: "row",
    backgroundColor: COLORS.primarySoft,
    padding: SPACING[12],
    borderRadius: RADIUS.lg,
    marginBottom: 16,
    gap: 10,
    alignItems: "center",
  },
  avatarBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: P.surf,
    justifyContent: "center",
    alignItems: "center",
  },
  speechBubbleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    lineHeight: 20,
  },
  quickAnswerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 6,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  amountChip: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  amountChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // ── Query Result ─────────────────────────────────────────────
  queryResultContainer: {
    alignItems: "center",
    paddingVertical: 14,
  },
  queryIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primarySoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  queryAnswerText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  doneQueryButton: {
    backgroundColor: COLORS.primaryFill,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  doneQueryButtonText: {
    color: P.onSolid,
    fontWeight: "700",
    fontSize: 14,
  },

  // ── Error View ───────────────────────────────────────────────
  errorContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  errorMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
    paddingHorizontal: 16,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryFill,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  retryButtonText: {
    color: P.onSolid,
    fontWeight: "600",
    fontSize: 14,
  },

  // ── Bottom Control Bar ───────────────────────────────────────
  bottomControlBar: {
    paddingHorizontal: SPACING[16],
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  voiceControlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 70,
  },
  keyboardModeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  centerMicWrapper: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: 80,
  },
  micRippleRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(225, 29, 72, 0.2)",
  },
  mainMicButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    ...SHADOWS.md,
    overflow: "hidden",
  },
  mainMicButtonActive: {
    transform: [{ scale: 1.08 }],
  },
  mainMicGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  textInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 52,
  },
  inlineTextInput: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendTextButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.acc,
    justifyContent: "center",
    alignItems: "center",
  },
  sendTextButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  switchModeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
}));

export default VoiceAgentAddonWidget;
