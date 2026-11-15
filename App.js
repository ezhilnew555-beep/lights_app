import { GestureHandlerRootView } from "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";

enableScreens();

import * as ExpoSplash from "expo-splash-screen";
// Keep the native splash up until the animated loader has rendered
ExpoSplash.preventAutoHideAsync().catch(() => {});

import React, { useEffect, useState, useRef } from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { navigationRef } from "./src/navigation/navigationRef";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import {
  Animated,
  StyleSheet,
  View,
  Platform,
  Keyboard,
  StatusBar,
  AppState,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { onSessionChange } from "./src/utils/secureStorage";
import { registerForPushNotificationsAsync, scheduleLocalNotification } from "./src/services/notificationService";
import { syncDailyNotifications, cancelDailyNotifications } from "./src/services/dailyNotifications";
import { updateProfile } from "./src/services/firestoreService";
import { P, FONT_FILES, themedStyles } from "./src/theme/theme";
import { ThemeProvider, useTheme, loadStoredTheme } from "./src/theme/ThemeProvider";
import Icon from "./src/components/pulse/Icon";
import { Text } from "./src/components/pulse/Text";
import { ScreenHeader, TitleHeader, Segmented, Press } from "./src/components/pulse";
import ToastHost, { setToastDockInset } from "./src/components/pulse/ToastHost";
import { OfflineBanner, CelebrationHost } from "./src/components/pulse/status";
import { startOfflineSync } from "./src/services/offlineStore";
import haptics, { loadHapticsPreference } from "./src/ux/haptics";
import { DURATION, EASE, SPRING, entrancesQuiet, reduceMotion, useReducedMotion } from "./src/ux/motion";
import { loadPrivacyPreference, usePrivacy } from "./src/ux/privacy";
import AppLoader from "./src/components/brand/AppLoader";
import { BRAND } from "./src/components/brand/LigthsOnLogo";
import AppLockGate from "./src/components/AppLockGate";
import { isAppLockEnabled } from "./src/services/appLock";

// Auth Screens
import SplashScreen from "./src/screens/auth/SplashScreen";
import LoginScreenView from "./src/screens/auth/LoginScreenView";
import RegisterScreenView from "./src/screens/auth/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/auth/ForgotPasswordScreen";
import OnboardingScreen from "./src/screens/auth/onboardingScreen";

// Calendar & Transaction Screens
import CalendarMain from "./src/screens/calendar/calendarmain";
import DateExpenses from "./src/screens/calendar/dateExpenses";
import Income from "./src/screens/transactions/Income";
import Expenses from "./src/screens/transactions/Expenses";

// Investment Screens
import FireNumber from "./src/screens/investments/FireNumber";

import FDScreen from "./src/screens/investments/FDScreen";
import RDScreen from "./src/screens/investments/RDScreen";
import GoalCalculator from "./src/screens/investments/GoalCalculator";
import InvestmentNavigation from "./src/screens/investments/InvestmentNavigation";
import MFScreen from "./src/screens/investments/MFScreen";
import MFCalculator from "./src/screens/investments/MFCalculator";
import StocksScreen from "./src/screens/investments/StocksScreen";
import StockDetailScreen from "./src/screens/investments/StockDetailScreen";
import StockSearchScreen from "./src/screens/investments/StockSearchScreen";
import SavingsScreen from "./src/screens/investments/SavingsScreen";
import BreakoutStocksScreen from "./src/screens/investments/BreakoutStocksScreen";
import WealthScreen from "./src/screens/wealth/WealthScreen";
import MFPortfolioScreen from "./src/screens/wealth/MFPortfolioScreen";
import MFHoldingScreen from "./src/screens/wealth/MFHoldingScreen";

// Other Screens
import Profile from "./src/screens/profile/Profile";
import CoinsScreen from "./src/screens/profile/CoinsScreen";
import MyRewardClaimsScreen from "./src/screens/profile/MyRewardClaimsScreen";
import NoteAIScreen from "./src/screens/ai/noteaiscreen";
import ReportScreen from "./src/screens/reports/ReportScreen";
import WeekRecap from "./src/screens/reports/WeekRecap";

// Voice Agent Widget
import VoiceAgentAddonWidget from "./src/components/VoiceAgentAddonWidget";

const Tab = createBottomTabNavigator();
const MAX_CONTENT_WIDTH = 720;
const MainStack = createStackNavigator();
const AuthStack = createStackNavigator();
const CalendarStack = createStackNavigator();
const WealthStack = createStackNavigator();
const PlanStack = createStackNavigator();
const MeStack = createStackNavigator();

// ── Headers ──────────────────────────────────────────────────────────

// Pulse stack header: back box · mono overline + title · theme toggle
const pulseHeader = (title, overline) => ({
  headerShown: true,
  header: ({ navigation, options }) => (
    <ScreenHeader
      title={options.title || title}
      overline={options.overline || overline}
      onBack={() => navigation.goBack()}
    />
  ),
});

const noHeader = { headerShown: false };

// A function so colours (and Reduce Motion) are read on every mount.
// Pushes keep the platform's own transition; Reduce Motion swaps the
// slide for a crossfade.
const stackScreenOptions = () => ({
  headerShown: false,
  cardStyle: { backgroundColor: P.bg },
  animation: reduceMotion() ? "fade" : "default",
});

// ── Shared investment screens (used by Home and Wealth stacks) ───────

const investmentScreens = (Stack) => (
  <>
    <Stack.Screen name="Investment" component={InvestmentNavigation} options={noHeader} />
    <Stack.Screen name="AddInvestment" component={InvestmentNavigation} options={noHeader} />
    <Stack.Screen name="FDScreen" component={FDScreen} options={noHeader} />
    <Stack.Screen name="RDScreen" component={RDScreen} options={noHeader} />
    <Stack.Screen name="MFPortfolio" component={MFPortfolioScreen} options={noHeader} />
    <Stack.Screen name="MFHolding" component={MFHoldingScreen} options={noHeader} />
    <Stack.Screen name="MFScreen" component={MFScreen} options={noHeader} />
    <Stack.Screen name="MFCalculator" component={MFCalculator} options={noHeader} />
    <Stack.Screen name="StocksScreen" component={StocksScreen} options={noHeader} />
    <Stack.Screen name="BreakoutStocksScreen" component={BreakoutStocksScreen} options={noHeader} />
    <Stack.Screen
      name="StockSearch"
      component={StockSearchScreen}
      options={pulseHeader("All companies", "NSE & BSE")}
    />
    <Stack.Screen
      name="StockDetail"
      component={StockDetailScreen}
      options={pulseHeader("Stock details", "Markets")}
    />
    <Stack.Screen name="SavingsScreen" component={SavingsScreen} options={noHeader} />
  </>
);

// Home tab
const CalendarStackNavigator = () => (
  <CalendarStack.Navigator screenOptions={stackScreenOptions()}>
    <CalendarStack.Screen name="CalendarMain" component={CalendarMain} />
    <CalendarStack.Screen
      name="DateExpenses"
      component={DateExpenses}
      options={pulseHeader("Daily transactions", "Day")}
    />
    <CalendarStack.Screen name="Income" component={Income} options={pulseHeader("Add income", "New entry")} />
    <CalendarStack.Screen name="Expenses" component={Expenses} options={pulseHeader("Add expense", "New entry")} />
    {investmentScreens(CalendarStack)}
    <CalendarStack.Screen
      name="ReportScreen"
      component={ReportScreen}
      options={pulseHeader("Financial reports", "Analytics")}
    />
    <CalendarStack.Screen name="WeekRecap" component={WeekRecap} options={noHeader} />
    <CalendarStack.Screen
      name="NoteAIScreen"
      component={NoteAIScreen}
      options={pulseHeader("Ligths Notes", "AI assistant")}
    />
  </CalendarStack.Navigator>
);

// Wealth tab
const WealthStackNavigator = () => (
  <WealthStack.Navigator screenOptions={stackScreenOptions()}>
    <WealthStack.Screen name="WealthHome" component={WealthScreen} />
    {investmentScreens(WealthStack)}
  </WealthStack.Navigator>
);

// Plan tab — F.I.R.E. / Goals with the design's segmented switch
const PlanHeader = ({ navigation, route }) => {
  const isGoals = route.name === "Goals";
  return (
    <View style={{ backgroundColor: P.bg }}>
      <TitleHeader overline="Plan" title={isGoals ? "Your goals" : "F.I.R.E."} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <Segmented
          height={40}
          fontSize={14}
          options={[
            { value: "FireNumber", label: "F.I.R.E." },
            { value: "Goals", label: "Goals" },
          ]}
          value={isGoals ? "Goals" : "FireNumber"}
          onChange={(v) => {
            if (v !== route.name) navigation.replace(v);
          }}
        />
      </View>
    </View>
  );
};

const PlanStackNavigator = () => (
  <PlanStack.Navigator
    screenOptions={{
      ...stackScreenOptions(),
      headerShown: true,
      header: (props) => <PlanHeader {...props} />,
      // F.I.R.E. ⇄ Goals is a switch between siblings, not a push: crossfade
      animation: reduceMotion() ? "none" : "fade",
    }}
  >
    <PlanStack.Screen name="FireNumber" component={FireNumber} />
    <PlanStack.Screen name="Goals" component={GoalCalculator} />
  </PlanStack.Navigator>
);

// Me tab
const MeStackNavigator = () => (
  <MeStack.Navigator screenOptions={stackScreenOptions()}>
    <MeStack.Screen name="ProfileHome" component={Profile} />
    <MeStack.Screen
      name="NoteAIScreen"
      component={NoteAIScreen}
      options={pulseHeader("Ligths Notes", "AI assistant")}
    />
    <MeStack.Screen
      name="ReportScreen"
      component={ReportScreen}
      options={pulseHeader("Financial reports", "Analytics")}
    />
    <MeStack.Screen name="Coins" component={CoinsScreen} />
    <MeStack.Screen name="WeekRecap" component={WeekRecap} options={noHeader} />
    <MeStack.Screen name="MyRewardClaims" component={MyRewardClaimsScreen} />
  </MeStack.Navigator>
);

// Auth Stack Navigator
const AuthNavigator = ({ hasSeenOnboarding }) => (
  <AuthStack.Navigator
    initialRouteName={hasSeenOnboarding ? "SplashScreen" : "Onboarding"}
    screenOptions={stackScreenOptions()}
  >
    <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
    <AuthStack.Screen name="SplashScreen" component={SplashScreen} />
    <AuthStack.Screen name="Login" component={LoginScreenView} />
    <AuthStack.Screen name="SignUp" component={RegisterScreenView} options={pulseHeader("Create account", "New member")} />
    <AuthStack.Screen
      name="ForgotPassword"
      component={ForgotPasswordScreen}
      options={pulseHeader("Reset password", "Account")}
    />
  </AuthStack.Navigator>
);

// ── Dock (bottom navigation) ─────────────────────────────────────────

const DOCK_ITEMS = {
  Calendar: { icon: "home", label: "Home" },
  Wealth: { icon: "chart", label: "Wealth" },
  Plan: { icon: "target", label: "Plan" },
  Profile: { icon: "user", label: "Me" },
};

// One dock destination. The highlight pill grows in behind the newly
// selected tab while its icon lifts, so the eye follows the switch.
const DockItem = ({ item, focused, onPress }) => {
  const on = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);

  useEffect(() => {
    Animated.spring(on, { toValue: focused ? 1 : 0, ...SPRING, useNativeDriver: true }).start();
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (focused && !reduceMotion()) {
      lift.setValue(0);
      Animated.sequence([
        Animated.timing(lift, { toValue: 1, duration: DURATION.tap, easing: EASE.out, useNativeDriver: true }),
        Animated.spring(lift, { toValue: 0, friction: 5, tension: 140, useNativeDriver: true }),
      ]).start();
    }
  }, [focused]);

  const fg = focused ? P.tabOnInk : P.tabOff;
  return (
    <Press
      scaleTo={0.92}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={item.label}
      onPress={onPress}
      style={styles.dockItem}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.dockPill,
          { opacity: on, transform: [{ scale: on.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] },
        ]}
      />
      <Animated.View
        style={{
          transform: [
            { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
            { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
          ],
        }}
      >
        <Icon name={item.icon} size={20} color={fg} />
      </Animated.View>
      <Text style={[styles.dockLabel, { color: fg }]}>{item.label}</Text>
    </Press>
  );
};

const PulseDock = ({ state, navigation, onVoice }) => {
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () =>
      setKeyboardOpen(true)
    );
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () =>
      setKeyboardOpen(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Toasts float just above the dock; with the keyboard up the dock hides.
  useEffect(() => {
    if (keyboardOpen) setToastDockInset(0);
  }, [keyboardOpen]);
  useEffect(() => () => setToastDockInset(0), []);

  if (keyboardOpen) return null;

  return (
    <View
      style={[styles.dockWrap, { paddingBottom: Math.max(insets.bottom, 8) + 6 }]}
      onLayout={(e) => setToastDockInset(Math.round(e.nativeEvent.layout.height) + 8)}
    >
      <View style={styles.dock} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          if (route.name === "AIVoice") {
            return (
              <Press
                key={route.key}
                scaleTo={0.9}
                haptic="select"
                accessibilityRole="button"
                accessibilityLabel="Log by voice"
                onPress={onVoice}
                style={styles.dockMic}
              >
                <Icon name="mic" size={22} color="#0C110E" strokeWidth={2} />
              </Press>
            );
          }
          const item = DOCK_ITEMS[route.name];
          if (!item) return null;
          return (
            <DockItem
              key={route.key}
              item={item}
              focused={focused}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (event.defaultPrevented) return;
                haptics.select();
                // Re-tapping a tab (or switching to it) always lands on its root screen
                const root = { Calendar: "CalendarMain", Wealth: "WealthHome", Plan: "FireNumber", Profile: "ProfileHome" }[
                  route.name
                ];
                navigation.navigate(route.name, { screen: root });
              }}
            />
          );
        })}
      </View>
    </View>
  );
};

const AIVoiceDummyScreen = () => <View style={{ flex: 1, backgroundColor: P.bg }} />;

// Main Tab Navigator
const MainApp = () => {
  const voiceAgentRef = useRef(null);
  const reduced = useReducedMotion();

  return (
    <>
      <Tab.Navigator
        initialRouteName="Calendar"
        tabBar={(props) => <PulseDock {...props} onVoice={() => voiceAgentRef.current?.open()} />}
        screenOptions={{
          lazy: true,
          freezeOnBlur: true,
          headerShown: false,
          sceneStyle: { backgroundColor: P.bg },
          // Tabs are siblings: a quick crossfade, no sideways travel
          animation: reduced ? "none" : "fade",
        }}
      >
        <Tab.Screen name="Calendar" component={CalendarStackNavigator} options={{ title: "Home" }} />
        <Tab.Screen name="Wealth" component={WealthStackNavigator} options={{ title: "Wealth" }} />
        <Tab.Screen name="AIVoice" component={AIVoiceDummyScreen} options={{ title: "Voice" }} />
        <Tab.Screen name="Plan" component={PlanStackNavigator} options={{ title: "Plan" }} />
        <Tab.Screen name="Profile" component={MeStackNavigator} options={{ title: "Me" }} />
      </Tab.Navigator>
      <VoiceAgentAddonWidget ref={voiceAgentRef} hideFab={true} />
    </>
  );
};

// ── Root ─────────────────────────────────────────────────────────────

const RootNavigator = ({ initialRoute, hasSeenOnboarding }) => {
  const { mode, dark } = useTheme();
  // Amounts are formatted at render time; remount (like the theme) so every
  // figure on screen picks up privacy mode
  const hidden = usePrivacy();
  // Keep the user's place when the theme remounts the navigation tree
  const navState = useRef(undefined);

  const navTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark ? DarkTheme : DefaultTheme).colors,
      primary: P.ink,
      background: P.bg,
      card: P.surf,
      text: P.ink,
      border: P.line,
      notification: P.neg,
    },
  };

  // Tablets and unfolded foldables: keep the phone layout in a readable
  // centred column instead of stretching cards and lists edge to edge
  return (
    <View style={{ flex: 1, backgroundColor: P.bg, alignItems: "center" }}>
    <View style={{ flex: 1, width: "100%", maxWidth: MAX_CONTENT_WIDTH }}>
    <ThemeFade key={`${mode}-${hidden ? "private" : "open"}`}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <NavigationContainer
        ref={navigationRef}
        theme={navTheme}
        initialState={navState.current}
        onStateChange={(s) => {
          navState.current = s;
        }}
      >
        <MainStack.Navigator screenOptions={stackScreenOptions()} initialRouteName={initialRoute}>
          <MainStack.Screen
            name="Auth"
            children={() => <AuthNavigator hasSeenOnboarding={hasSeenOnboarding} />}
          />
          <MainStack.Screen name="MainApp" component={MainApp} options={{ gestureEnabled: false }} />
          <MainStack.Screen name="Coins" component={CoinsScreen} />
          <MainStack.Screen name="MyRewardClaims" component={MyRewardClaimsScreen} />
        </MainStack.Navigator>
      </NavigationContainer>
    </ThemeFade>
    </View>
    </View>
  );
};

// The navigation tree remounts for a new theme; fade the new palette in
// rather than snapping. First launch is handled by AppLoader's fade.
const ThemeFade = ({ children }) => {
  const o = useRef(new Animated.Value(entrancesQuiet() ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(o, { toValue: 1, duration: DURATION.base, easing: EASE.out, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={{ flex: 1, opacity: o }}>{children}</Animated.View>;
};

const App = () => {
  const [initialRoute, setInitialRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [themeReady, setThemeReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const [introDone, setIntroDone] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [startLocked, setStartLocked] = useState(false);
  const firstAuthEvent = useRef(true);

  // Never let the intro animation gate the app: continue after 1.8 s regardless
  useEffect(() => {
    const t = setTimeout(() => setIntroDone(true), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    Promise.all([loadStoredTheme(), loadHapticsPreference(), loadPrivacyPreference()]).finally(() => setThemeReady(true));
  }, []);

  useEffect(() => {
    const checkOnboarding = async () => {
      const hasSeenOnboardingValue = await AsyncStorage.getItem("hasSeenOnboarding");
      setHasSeenOnboarding(hasSeenOnboardingValue === "true");
    };
    checkOnboarding();

    // Firebase Auth state listener — fires immediately with current user (or null)
    const unsubscribe = onSessionChange(async (user) => {
      // Lock on launch only; a fresh sign-in has just proven who the user is.
      if (firstAuthEvent.current) {
        firstAuthEvent.current = false;
        if (user) setStartLocked(await isAppLockEnabled());
      }
      setSignedIn(!!user);
      if (user) {
        console.log("App.js: Firebase user signed in →", user.email);
        setInitialRoute("MainApp");

        // In the background: the push token needs the network, and the app
        // must open straight away offline.
        (async () => {
        try {
          // Asks for notification permission, then schedules the 6 AM / 9 PM IST notifications.
          const pushToken = await registerForPushNotificationsAsync();
          syncDailyNotifications();
          if (pushToken) {
            await updateProfile(user.uid, { pushToken });
            console.log("App.js: Saved push token to user profile");

            // Welcome once per account on this device, not on every launch
            const welcomeKey = `welcomeNotified:${user.uid}`;
            if (!(await AsyncStorage.getItem(welcomeKey))) {
              await AsyncStorage.setItem(welcomeKey, "1");
              scheduleLocalNotification(
                "Welcome to LigthsON! 🌟",
                "You'll get a motivation quote at 6 AM and a daily check-in at 9 PM.",
                new Date(Date.now() + 2000)
              );
            }
          }
        } catch (error) {
          console.error("App.js: Error saving push token", error);
        }
        })();
      } else {
        console.log("App.js: No Firebase user → Auth stack");
        cancelDailyNotifications();
        setInitialRoute("Auth");
      }
      setIsLoading(false);
    });

    return unsubscribe; // Cleanup listener on unmount
  }, []);

  // Offline-first data: push changes saved on the phone whenever the network is back
  useEffect(() => {
    startOfflineSync();
  }, []);

  // Keep the rolling window of daily notifications topped up
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") syncDailyNotifications();
    });
    return () => sub.remove();
  }, []);

  // Fonts failing to load must not block the app — it falls back to system fonts.
  const fontsReady = fontsLoaded || !!fontError;

  const appReady = !isLoading && fontsReady && themeReady;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: BRAND.ink }}>
      {appReady ? (
        <SafeAreaProvider>
          <ThemeProvider>
            <RootNavigator initialRoute={initialRoute} hasSeenOnboarding={hasSeenOnboarding} />
            <ToastHost />
            <OfflineBanner />
            <CelebrationHost />
            <AppLockGate signedIn={signedIn} startLocked={startLocked} canPrompt={loaderGone} />
          </ThemeProvider>
        </SafeAreaProvider>
      ) : null}
      {!loaderGone ? (
        <AppLoader
          visible={!(appReady && introDone)}
          fontsReady={fontsReady}
          // The JS loader is on screen: hand over from the native splash
          onLayout={() => ExpoSplash.hideAsync().catch(() => {})}
          onIntroEnd={() => setIntroDone(true)}
          onHidden={() => setLoaderGone(true)}
        />
      ) : null}
    </GestureHandlerRootView>
  );
};

// Styles
const styles = themedStyles(() =>
  StyleSheet.create({
    dockWrap: {
      paddingTop: 6,
      paddingHorizontal: 12,
      backgroundColor: P.bg,
    },
    dock: {
      height: 64,
      borderRadius: 22,
      backgroundColor: P.dock,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
    },
    dockItem: {
      flex: 1,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    dockPill: {
      borderRadius: 16,
      backgroundColor: P.tabOnBg,
    },
    dockLabel: {
      fontSize: 10,
      fontWeight: "600",
    },
    dockMic: {
      width: 52,
      height: 48,
      borderRadius: 16,
      backgroundColor: P.dockMic,
      alignItems: "center",
      justifyContent: "center",
    },
  })
);

export default App;
