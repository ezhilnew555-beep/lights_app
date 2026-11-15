import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Alert,
  Linking,
  Image,
} from "react-native";
import { Text, TextInput } from "../../components/pulse/Text";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { clearUserSession } from "../../utils/secureStorage";
import { getProfile as getUserProfile, updateProfile as updateUserProfile } from "../../services/firestoreService";
import { auth } from "../../config/FirebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, P, themedStyles } from "../../theme/theme";
import { useTheme } from "../../theme/ThemeProvider";
import { amountsHidden, toggleAmountsHidden } from "../../ux/privacy";
import { Icon, Card, ListRow, SectionHeader, TitleHeader, Button, ToastHost, ScreenSkeleton, FadeIn, Press, ErrorState } from "../../components/pulse";
import { MONTHS_LONG } from "../../utils/format";
import { navigationRef } from "../../navigation/navigationRef";
import { authenticate, hasDeviceLock, isAppLockEnabled, setAppLockEnabled } from "../../services/appLock";
import { toast } from "../../ux/toast";
import { PopupModal, PopupBackdrop, PopupPanel } from "../../components/pulse/popup";
import { hapticsEnabled, setHapticsEnabled } from "../../ux/haptics";
const { width } = Dimensions.get("window");

const ProfilePage = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { dark, toggleTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editableProfile, setEditableProfile] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [appLock, setAppLock] = useState(false);
  const [haptic, setHaptic] = useState(hapticsEnabled());



  const formatCurrency = (value) => {
    if (!value || value === "0.00" || value === 0) return "0";
    return parseFloat(value).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const fetchProfile = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("Please sign in again to continue.", { title: "Session expired" });
        navigation.replace("Login");
        return;
      }

      const profileData = await getUserProfile(uid);
      if (!profileData) {
        setError("Profile not found. Please contact support.");
        return;
      }
      setProfile(profileData);
      setEditableProfile(profileData);
    } catch (err) {
      console.error("❌ Error fetching profile:", err);
      setError("Failed to load profile. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    isAppLockEnabled().then(setAppLock);
  }, []);

  const toggleAppLock = async () => {
    try {
      const next = !appLock;
      if (next && !(await hasDeviceLock())) {
        Alert.alert(
          "Set up a screen lock",
          "App lock uses your phone's fingerprint, face, PIN, pattern or password. Set one up in your device Settings first.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      const ok = await authenticate(next ? "Confirm to turn on app lock" : "Confirm to turn off app lock");
      if (!ok) return;
      await setAppLockEnabled(next);
      setAppLock(next);
      toast.success(next ? "LigthsON will ask for your screen lock when you return." : "App lock is off.", {
        title: next ? "App lock on" : undefined,
      });
    } catch (err) {
      console.error("Error changing app lock:", err);
      toast.error("Could not change app lock on this device.", { title: "App lock" });
    }
  };

  useEffect(() => {
    fetchProfile();

    const unsubscribe = navigation.addListener("focus", () => {
      fetchProfile(true);
    });
    return unsubscribe;
  }, [navigation]);



  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await clearUserSession();
              // Reset the root navigator (Profile now lives inside the Me tab stack)
              navigationRef.reset({
                index: 0,
                routes: [{ name: "Auth", params: { screen: "Login" } }],
              });
            } catch (err) {
              console.error("❌ Error signing out:", err);
              toast.error("Couldn't sign out. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleUpdateProfile = async () => {
    try {
      setIsSaving(true);
      if (!editableProfile.firstName?.trim() || !editableProfile.lastName?.trim()) {
        toast.error("First name and last name are required.");
        setIsSaving(false);
        return;
      }

      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("User not logged in. Please log in again.");
        setIsSaving(false);
        return;
      }

      const updateData = {
        firstName: editableProfile.firstName,
        lastName: editableProfile.lastName,
        phoneNumber: editableProfile.phoneNumber,
        age: editableProfile.age,
        retirementAge: editableProfile.retirementAge,
        country: editableProfile.country,
      };

      await updateUserProfile(uid, updateData);
      setProfile({ ...profile, ...updateData });
      setEditModalVisible(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.", { title: "Update failed" });
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    if (!profile) return "U";
    const firstInitial = profile.firstName ? profile.firstName[0] : "";
    const lastInitial = profile.lastName ? profile.lastName[0] : "";
    return (firstInitial + lastInitial).toUpperCase();
  };

  const renderFirePhaseBadge = (pct) => {
    let phase = "";
    let desc = "";
    let color = "";
    let bg = "";

    if (pct < 10) {
      phase = "Ignition";
      desc = "Just starting your journey. Fuel the fire!";
      color = P.neg; // pink-red
      bg = "rgba(239, 68, 68, 0.2)";
    } else if (pct < 25) {
      phase = "Spark";
      desc = "Building momentum. Keep investing!";
      color = P.amber; // amber-yellow
      bg = "rgba(245, 158, 11, 0.25)";
    } else if (pct < 50) {
      phase = "Flame";
      desc = "The fire is burning. Halfway to safety!";
      color = P.amber; // orange
      bg = "rgba(249, 115, 22, 0.25)";
    } else if (pct < 75) {
      phase = "Blaze";
      desc = "A roaring blaze! You are doing amazing.";
      color = P.amber; // bright gold
      bg = "rgba(234, 179, 8, 0.25)";
    } else if (pct < 100) {
      phase = "Inferno";
      desc = "Almost independent. Freedom is near!";
      color = P.neg; // pink-red
      bg = "rgba(225, 29, 72, 0.25)";
    } else {
      phase = "F.I.R.E. unlocked";
      desc = "Congratulations, you are financially free!";
      color = P.pos; // light green
      bg = "rgba(16, 185, 129, 0.25)";
    }

    return (
      <View style={styles.firePhaseWrapper}>
        <View style={[styles.firePhaseBadge, { backgroundColor: bg }]}>
          <Text style={[styles.firePhaseText, { color }]}>{phase}</Text>
        </View>
        <Text style={styles.firePhaseDesc}>{desc}</Text>
      </View>
    );
  };



  if (loading && !profile) {
    return (
      <ScreenSkeleton safe header rows={5} />
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: P.bg }}>
        <ErrorState fill title="Couldn't load your profile" message={error} onRetry={() => fetchProfile()} />
      </View>
    );
  }

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon} size={20} color={P.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "Not set"}</Text>
      </View>
    </View>
  );

  const MenuItem = ({ icon, label, onPress, danger }) => (
    <Press scaleTo={0.96} activeOpacity={0.7} style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconContainer, danger && styles.dangerIconContainer]}>
        <Ionicons name={icon} size={20} color={danger ? P.neg : P.primary} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.dangerText]}>{label}</Text>
      <Icon name="chevron" size={20} color={P.mute} />
    </Press>
  );

  const memberSince = (() => {
    const raw = profile.createdAt || auth.currentUser?.metadata?.creationTime;
    const d = raw?.toDate ? raw.toDate() : raw?.seconds ? new Date(raw.seconds * 1000) : raw ? new Date(raw) : null;
    return d && !isNaN(d.getTime()) ? `Member since ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}` : null;
  })();
  const maskedPhone = profile.phoneNumber
    ? `${String(profile.phoneNumber).slice(0, 3)} ••••• ••${String(profile.phoneNumber).slice(-3)}`
    : "Not set";
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.userName || "Your profile";

  const SettingRow = ({ icon, title, subtitle, onPress, last }) => (
    <Press scaleTo={0.96} onPress={onPress} activeOpacity={0.7} style={[styles.pRow, last && { borderBottomWidth: 0 }]}>
      {icon ? <Icon name={icon} size={20} color={P.ink2} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.pRowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pRowSub}>{subtitle}</Text> : null}
      </View>
      <Icon name="chevron" size={18} color={P.mute} />
    </Press>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <TitleHeader overline="Profile" title={fullName} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pBody}>
        <FadeIn style={styles.pIdentity}>
          <View style={styles.pAvatar}>
            <Text mono style={styles.pAvatarText}>
              {getInitials() || "L"}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.pEmail} numberOfLines={1}>
              {profile.email || auth.currentUser?.email}
            </Text>
            <Text style={styles.pRowSub}>{memberSince || (profile.userName ? `@${profile.userName}` : "")}</Text>
          </View>
        </FadeIn>

        <FadeIn delay={45}>
        <Press scaleTo={0.97} accessibilityRole="button" style={styles.pCoins} onPress={() => navigation.navigate("Coins")}>
          <Icon name="coin" size={28} color={P.accInk} strokeWidth={1.6} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text mono style={styles.pCoinsValue}>
              {Number(profile.coins || 0).toLocaleString("en-IN")} coins
            </Text>
            <Text style={styles.pCoinsSub}>Earn by logging daily · redeem premium rewards</Text>
          </View>
          <Icon name="chevron" size={20} color={P.accInk} />
        </Press>
        </FadeIn>

        <SectionHeader title="Personal information" action="Edit" onAction={() => setEditModalVisible(true)} />
        <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
          <ListRow title="Age" right={profile.age ? String(profile.age) : "—"} />
          <ListRow title="Retirement age" right={profile.retirementAge ? String(profile.retirementAge) : "—"} />
          <ListRow title="Country" right={profile.country || "—"} />
          <ListRow title="Phone" right={maskedPhone} last />
        </Card>

        <SectionHeader title="Settings" />
        <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
          <SettingRow
            icon={dark ? "sun" : "moon"}
            title="Appearance"
            subtitle={dark ? "Dark · switch to light theme" : "Light · switch to dark theme"}
            onPress={toggleTheme}
          />
          {Platform.OS !== "web" ? (
            <SettingRow
              icon="lock"
              title="App lock"
              subtitle={
                appLock ? "On · unlock with your phone's screen lock" : "Off · use fingerprint, face or phone PIN"
              }
              onPress={toggleAppLock}
            />
          ) : null}
          <SettingRow
            icon={amountsHidden() ? "eyeOff" : "eye"}
            title="Hide amounts"
            subtitle={amountsHidden() ? "On · amounts show as ₹••••" : "Off · tap the eye on Home to hide quickly"}
            onPress={toggleAmountsHidden}
          />
          {Platform.OS !== "web" ? (
            <SettingRow
              icon="bolt"
              title="Haptic feedback"
              subtitle={haptic ? "On · gentle vibration on taps and saves" : "Off · no vibration"}
              onPress={() => {
                setHapticsEnabled(!haptic);
                setHaptic(!haptic);
              }}
            />
          ) : null}
          <SettingRow
            icon="notes"
            title="AI Notes"
            subtitle="Voice notes with location tags"
            onPress={() => navigation.navigate("NoteAIScreen")}
          />
          <SettingRow
            icon="calendar"
            title="Weekly recap"
            subtitle="Your last 7 days, at a glance"
            onPress={() => navigation.navigate("WeekRecap")}
          />
          <SettingRow
            icon="report"
            title="Reports"
            subtitle="Monthly and custom range exports"
            onPress={() => navigation.navigate("ReportScreen")}
          />
          <SettingRow
            icon="gift"
            title="My reward claims"
            subtitle="Track premium reward requests"
            onPress={() => navigation.navigate("MyRewardClaims")}
          />
          <SettingRow
            icon="bell"
            title="Notifications"
            subtitle="6:00 AM motivation · 9:00 PM log reminder"
            onPress={() =>
              Alert.alert("Notifications", "App notifications can be managed in your device Settings.", [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() },
              ])
            }
          />
          <SettingRow
            icon="lock"
            title="Password"
            subtitle="Send a reset link to your email"
            onPress={() => navigation.navigate("Auth", { screen: "ForgotPassword" })}
            last
          />
        </Card>

        <Button title="Sign out" icon="logout" variant="ghost" onPress={handleSignOut} />
        <Text style={styles.pVersion}>LigthsON · Version 1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <PopupModal toastHost={false}
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <PopupBackdrop component={KeyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <PopupPanel style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close"
                style={styles.modalCloseButton}
                onPress={() => {
                  setEditableProfile(profile);
                  setEditModalVisible(false);
                }}
              >
                <Icon name="close" size={24} color={P.mute} />
              </Press>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalContent}
            >
              <View style={styles.modalAvatarSection}>
                <View style={styles.modalAvatarContainer}>
                  <Text style={styles.modalAvatarText}>{getInitials()}</Text>
                </View>
                <Press scaleTo={0.96} activeOpacity={0.7} style={styles.modalChangePhotoButton}>
                  <Text style={styles.modalChangePhotoText}>Change Photo</Text>
                </Press>
              </View>

              <View style={styles.modalForm}>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>First Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter first name"
                    placeholderTextColor={P.mute}
                    value={editableProfile.firstName}
                    onChangeText={(text) =>
                      setEditableProfile({ ...editableProfile, firstName: text })
                    }
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter last name"
                    placeholderTextColor={P.mute}
                    value={editableProfile.lastName}
                    onChangeText={(text) =>
                      setEditableProfile({ ...editableProfile, lastName: text })
                    }
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter phone number"
                    placeholderTextColor={P.mute}
                    keyboardType="phone-pad"
                    value={editableProfile.phoneNumber}
                    onChangeText={(text) =>
                      setEditableProfile({ ...editableProfile, phoneNumber: text })
                    }
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalInputLabel}>Country</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter country"
                    placeholderTextColor={P.mute}
                    value={editableProfile.country}
                    onChangeText={(text) =>
                      setEditableProfile({ ...editableProfile, country: text })
                    }
                  />
                </View>

                <View style={styles.modalRow}>
                  <View style={[styles.modalInputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.modalInputLabel}>Age</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Age"
                      placeholderTextColor={P.mute}
                      keyboardType="numeric"
                      value={editableProfile.age?.toString()}
                      onChangeText={(text) =>
                        setEditableProfile({
                          ...editableProfile,
                          age: text ? parseInt(text) : "",
                        })
                      }
                    />
                  </View>

                  <View style={[styles.modalInputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.modalInputLabel}>Retirement Age</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Retirement"
                      placeholderTextColor={P.mute}
                      keyboardType="numeric"
                      value={editableProfile.retirementAge?.toString()}
                      onChangeText={(text) =>
                        setEditableProfile({
                          ...editableProfile,
                          retirementAge: text ? parseInt(text) : "",
                        })
                      }
                    />
                  </View>
                </View>

                <View style={styles.modalReadOnlyGroup}>
                  <Text style={styles.modalInputLabel}>Email</Text>
                  <View style={styles.modalReadOnlyInput}>
                    <Text style={styles.modalReadOnlyText}>
                      {editableProfile.email}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalReadOnlyGroup}>
                  <Text style={styles.modalInputLabel}>Username</Text>
                  <View style={styles.modalReadOnlyInput}>
                    <Text style={styles.modalReadOnlyText}>
                      @{editableProfile.userName}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Press scaleTo={0.96} activeOpacity={0.7}
                style={styles.modalCancelButton}
                onPress={() => {
                  setEditableProfile(profile);
                  setEditModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Press>
              <Press scaleTo={0.96} activeOpacity={0.7}
                style={styles.modalSaveButton}
                onPress={handleUpdateProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={P.onSolid} />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </Press>
            </View>
          </PopupPanel>
        </PopupBackdrop>
        <ToastHost inModal />
      </PopupModal>



    </SafeAreaView>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  pBody: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  pIdentity: { flexDirection: "row", alignItems: "center", gap: 14 },
  pAvatar: { width: 60, height: 60, borderRadius: 16, backgroundColor: P.acc, alignItems: "center", justifyContent: "center" },
  pAvatarText: { fontSize: 20, fontWeight: "700", color: P.accInk },
  pEmail: { fontSize: 15, fontWeight: "600", color: P.ink },
  pCoins: { backgroundColor: P.acc, padding: 16, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 14 },
  pCoinsValue: { fontSize: 22, fontWeight: "700", color: P.accInk },
  pCoinsSub: { fontSize: 13, color: P.accInk, opacity: 0.85 },
  pRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: P.line },
  pRowTitle: { fontSize: 15, fontWeight: "600", color: P.ink },
  pRowSub: { fontSize: 13, color: P.ink2 },
  pVersion: { textAlign: "center", fontSize: 12, color: P.mute },
  safeArea: {
    flex: 1,
    backgroundColor: P.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.surf,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 16 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: P.ink,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: P.bg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: P.mute,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: P.bg,
    padding: 24,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: P.negSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 8,
  },
  errorText: {
    color: P.mute,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: P.solid,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    color: P.onSolid,
    fontSize: 16,
    fontWeight: "600",
  },
  profileCard: {
    backgroundColor: P.surf,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 12,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: P.line,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: P.primary,
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: P.solid,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: P.line,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 4,
  },
  userNameBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 4,
  },
  coinBadgeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.amberSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.amberSoft,
  },
  coinBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: P.amber,
    marginLeft: 4,
  },
  userHandleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  userHandle: {
    fontSize: 14,
    color: P.mute,
    marginLeft: 4,
  },
  profileStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: P.line,
  },
  badgesContainer: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
  },
  badgeItem: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: P.bg,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "visible",
  },
  badgeImage: {
    width: 44,
    height: 44,
    resizeMode: "contain",
  },
  badgeCount: {
    position: "absolute",
    right: -6,
    top: -6,
    backgroundColor: P.solid,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: P.line,
  },
  badgeCountText: {
    color: P.onSolid,
    fontSize: 11,
    fontWeight: "800",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: P.pos,
  },
  statLabel: {
    fontSize: 12,
    color: P.mute,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: "100%",
    backgroundColor: P.surf2,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
    backgroundColor: P.surf,
    borderRadius: 16,
    padding: 12,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  quickActionItem: {
    alignItems: "center",
    flex: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: P.primary,
    fontWeight: "500",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 16,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: P.surf,
    borderRadius: 20,
    padding: 8,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: P.mute,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: P.ink,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dangerIconContainer: {
    backgroundColor: P.negSoft,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: P.ink,
  },
  dangerText: {
    color: P.neg,
  },
  divider: {
    height: 1,
    backgroundColor: P.surf2,
    marginLeft: 64,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.neg,
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 16,
    marginBottom: 40,
  },
  signOutText: {
    color: P.onSolid,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  versionText: {
    textAlign: "center",
    color: P.mute,
    fontSize: 12,
    marginBottom: 20,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: P.overlay,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: P.surf,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: P.ink,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  modalAvatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modalAvatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: P.primary,
  },
  modalChangePhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalChangePhotoText: {
    color: P.neg,
    fontSize: 14,
    fontWeight: "600",
  },
  modalForm: {
    paddingBottom: 20,
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: P.mute,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: P.bg,
    borderWidth: 1,
    borderColor: P.line,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: P.ink,
  },
  modalRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  modalReadOnlyGroup: {
    marginBottom: 20,
  },
  modalReadOnlyInput: {
    backgroundColor: P.surf2,
    borderWidth: 1,
    borderColor: P.line,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalReadOnlyText: {
    fontSize: 16,
    color: P.mute,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: P.line,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: P.surf2,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginRight: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: P.mute,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: P.pos,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginLeft: 8,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: P.onSolid,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  badgesModalContainer: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: P.surf,
    borderRadius: 16,
    padding: 18,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  badgesGridItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 14,
  },
  badgeImageLarge: {
    width: 84,
    height: 84,
    resizeMode: 'contain',
  },
  badgeGridLabel: {
    marginTop: 8,
    fontSize: 13,
    color: P.mute,
    fontWeight: '700',
  },
  badgeGridCount: {
    marginTop: 4,
    fontSize: 14,
    color: P.ink,
    fontWeight: '800',
  },
  badgeTestContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: P.surf,
    borderRadius: 12,
    padding: 18,
  },
  modalRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}));

export default ProfilePage;