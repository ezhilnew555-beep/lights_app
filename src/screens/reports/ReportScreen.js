import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
} from "react-native";
import { Text, TextInput } from "../../components/pulse/Text";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import { Picker } from "@react-native-picker/picker";
import simpleReportService from "../../services/simpleReportService";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { moderateScale } from "../../utils/responsive";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, P, themedStyles } from "../../theme/theme";
import { ScreenHeader, IconButton, ClockLoader, Icon, Press } from "../../components/pulse";

import { toast } from "../../ux/toast";
import { PopupModal, PopupBackdrop, PopupPanel } from "../../components/pulse/popup";
import ToastHost from "../../components/pulse/ToastHost";
const { width, height } = Dimensions.get("window");
const isCompactScreen = width < 360;

const ReportScreen = ({ route }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const optionTitleSize = moderateScale(isCompactScreen ? 16 : 18);
  const optionDescriptionSize = moderateScale(isCompactScreen ? 12 : 14);
  const optionIconSize = moderateScale(isCompactScreen ? 26 : 32);
  const optionChevronSize = moderateScale(isCompactScreen ? 20 : 24);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportHtml, setReportHtml] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );
  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );

  const months = [
    { label: "January", value: "01" },
    { label: "February", value: "02" },
    { label: "March", value: "03" },
    { label: "April", value: "04" },
    { label: "May", value: "05" },
    { label: "June", value: "06" },
    { label: "July", value: "07" },
    { label: "August", value: "08" },
    { label: "September", value: "09" },
    { label: "October", value: "10" },
    { label: "November", value: "11" },
    { label: "December", value: "12" },
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 5; i <= currentYear + 1; i++) {
    years.push(String(i));
  }

  // Hide React Navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const generateReport = async (type, params = {}) => {
    try {
      setLoading(true);
      let html;

      switch (type) {
        case "monthly":
          html = await simpleReportService.generateMonthlyReportHtml(
            params.month || selectedMonth,
            params.year || selectedYear
          );
          break;
        case "annual":
          html = await simpleReportService.generateAnnualReportHtml(
            params.year || selectedYear
          );
          break;
        case "custom":
          html = await simpleReportService.generateCustomReportHtml(
            params.startDate || customStartDate,
            params.endDate || customEndDate
          );
          break;
        default:
          throw new Error("Invalid report type");
      }

      setReportHtml(html);
      setSelectedReportType(type);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedReportType) {
      toast.warning("Please select a report type first.");
      return;
    }

    try {
      setLoading(true);

      switch (selectedReportType) {
        case "monthly":
          await simpleReportService.generateMonthlyReport(
            selectedMonth,
            selectedYear
          );
          toast.success("Monthly report downloaded successfully!");
          break;
        case "annual":
          await simpleReportService.generateAnnualReport(selectedYear);
          toast.success("Annual report downloaded successfully!");
          break;
        case "custom":
          await simpleReportService.generateCustomReport(
            customStartDate,
            customEndDate
          );
          toast.success("Custom report downloaded successfully!");
          break;
        default:
          toast.error("Invalid report type selected.");
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomReportSubmit = () => {
    if (!customStartDate || !customEndDate) {
      toast.warning("Please enter both start and end dates.");
      return;
    }

    if (new Date(customStartDate) > new Date(customEndDate)) {
      toast.warning("Start date must be before end date.");
      return;
    }

    setShowCustomModal(false);
    generateReport("custom");
  };

  const resetToSelection = () => {
    setSelectedReportType(null);
    setReportHtml("");
  };

  if (selectedReportType && reportHtml) {
    // Show report preview
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
        
        {/* Header */}
        <ScreenHeader
          overline="Analytics"
          title={
            selectedReportType === "monthly"
              ? "Monthly report"
              : selectedReportType === "annual"
              ? "Annual report"
              : "Custom report"
          }
          onBack={resetToSelection}
          right={
            <IconButton accessibilityLabel="Download report" onPress={handleDownloadReport} style={{ backgroundColor: P.acc, borderColor: P.acc }}>
              {loading ? <ActivityIndicator color={P.accInk} /> : <Icon name="download" size={20} color={P.accInk} />}
            </IconButton>
          }
        />

        {/* Report Preview */}
        <View style={styles.reportContainer}>
          {loading ? (
            <ClockLoader fill label="Preparing your report…" />
          ) : (
            <WebView
              source={{ html: reportHtml }}
              style={styles.webview}
              showsVerticalScrollIndicator={true}
              showsHorizontalScrollIndicator={false}
              scalesPageToFit={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ClockLoader />
                </View>
              )}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Show report selection screen
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      
      {/* Header */}
        <ScreenHeader overline="Analytics" title="Financial reports" />
      
      <ScrollView
        style={styles.selectionContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 128 + insets.bottom },
        ]}
      >
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeIcon}>
            <Icon name="report" size={48} color={P.primary} />
          </View>
          <Text style={styles.welcomeTitle}>Financial Reports</Text>
          <Text style={styles.welcomeSubtitle}>
            Generate and download detailed financial reports
          </Text>
        </View>

        {/* Monthly Report Option */}
        <Press scaleTo={0.96}
          style={[
            styles.reportOption,
            { padding: isCompactScreen ? 14 : 18 },
          ]}
          onPress={() => {
            generateReport("monthly");
          }}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.optionIcon,
              {
                backgroundColor: P.surf2,
                width: isCompactScreen ? 48 : 60,
                height: isCompactScreen ? 48 : 60,
                borderRadius: isCompactScreen ? 24 : 30,
                marginRight: isCompactScreen ? 12 : 16,
              },
            ]}
          >
            <Icon name="calendar" size={optionIconSize} color={P.primary} />
          </View>
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, { fontSize: optionTitleSize }]}>
              Monthly Report
            </Text>
            <Text style={[styles.optionDescription, { fontSize: optionDescriptionSize }]}>
              {months.find((m) => m.value === selectedMonth)?.label}{" "}
              {selectedYear}
            </Text>
          </View>
          <Icon name="chevron" size={optionChevronSize} color={P.mute} />
        </Press>

        {/* Annual Report Option */}
        <Press scaleTo={0.96}
          style={[
            styles.reportOption,
            { padding: isCompactScreen ? 14 : 18 },
          ]}
          onPress={() => {
            generateReport("annual");
          }}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.optionIcon,
              {
                backgroundColor: P.posSoft,
                width: isCompactScreen ? 48 : 60,
                height: isCompactScreen ? 48 : 60,
                borderRadius: isCompactScreen ? 24 : 30,
                marginRight: isCompactScreen ? 12 : 16,
              },
            ]}
          >
            <Icon name="chart" size={optionIconSize} color={P.pos} />
          </View>
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, { fontSize: optionTitleSize }]}>
              Annual Report
            </Text>
            <Text style={[styles.optionDescription, { fontSize: optionDescriptionSize }]}>
              Year {selectedYear}
            </Text>
          </View>
          <Icon name="chevron" size={optionChevronSize} color={P.mute} />
        </Press>

        {/* Custom Report Option */}
        <Press scaleTo={0.96}
          style={[
            styles.reportOption,
            { padding: isCompactScreen ? 14 : 18 },
          ]}
          onPress={() => setShowCustomModal(true)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.optionIcon,
              {
                backgroundColor: P.amberSoft,
                width: isCompactScreen ? 48 : 60,
                height: isCompactScreen ? 48 : 60,
                borderRadius: isCompactScreen ? 24 : 30,
                marginRight: isCompactScreen ? 12 : 16,
              },
            ]}
          >
            <Ionicons name="options-outline" size={optionIconSize} color={P.amber} />
          </View>
          <View style={styles.optionContent}>
            <Text style={[styles.optionTitle, { fontSize: optionTitleSize }]}>
              Custom Date Range
            </Text>
            <Text style={[styles.optionDescription, { fontSize: optionDescriptionSize }]}>
              Select custom dates
            </Text>
          </View>
          <Icon name="chevron" size={optionChevronSize} color={P.mute} />
        </Press>

        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ClockLoader label="Generating report…" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Custom Date Modal */}
      <PopupModal toastHost={false}
        visible={showCustomModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomModal(false)}
      >
        <PopupBackdrop style={styles.modalOverlay}>
          <PopupPanel placement="center" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Icon name="calendar" size={32} color={P.primary} />
              </View>
              <Text style={styles.modalTitle}>Custom Date Range</Text>
              <Text style={styles.modalSubtitle}>
                Select start and end dates for your report
              </Text>
            </View>
            <View style={styles.dateSection}>
              <Text style={styles.inputLabel}>Start Date</Text>
              <TextInput
                style={styles.dateInput}
                value={customStartDate}
                onChangeText={(text) => {
                  // Auto-format date as user types
                  let formatted = text.replace(/\D/g, "");
                  if (formatted.length >= 4) {
                    formatted =
                      formatted.substring(0, 4) + "-" + formatted.substring(4);
                  }
                  if (formatted.length >= 7) {
                    formatted =
                      formatted.substring(0, 7) +
                      "-" +
                      formatted.substring(7, 9);
                  }
                  setCustomStartDate(formatted);
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={P.mute}
                maxLength={10}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.dateSection}>
              <Text style={styles.inputLabel}>End Date</Text>
              <TextInput
                style={styles.dateInput}
                value={customEndDate}
                onChangeText={(text) => {
                  // Auto-format date as user types
                  let formatted = text.replace(/\D/g, "");
                  if (formatted.length >= 4) {
                    formatted =
                      formatted.substring(0, 4) + "-" + formatted.substring(4);
                  }
                  if (formatted.length >= 7) {
                    formatted =
                      formatted.substring(0, 7) +
                      "-" +
                      formatted.substring(7, 9);
                  }
                  setCustomEndDate(formatted);
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={P.mute}
                maxLength={10}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.modalButtons}>
              <Press scaleTo={0.96} activeOpacity={0.7}
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCustomModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Press>

              <Press scaleTo={0.96} activeOpacity={0.7}
                style={[styles.modalButton, styles.generateButton]}
                onPress={handleCustomReportSubmit}
              >
                <Text style={styles.generateButtonText}>Generate</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: P.surf,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: P.surf,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.bg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: P.ink,
  },
  downloadButton: {
    backgroundColor: P.acc,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  reportContainer: {
    flex: 1,
    margin: 16,
    backgroundColor: P.surf,
    borderRadius: 16,
    elevation: 0,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    overflow: "hidden", borderWidth: 1, borderColor: P.line,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: P.surf,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: P.mute,
    fontWeight: "500",
  },
  webviewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: P.surf,
  },
  // Selection Screen Styles
  selectionContainer: {
    flex: 1,
    backgroundColor: P.bg,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  welcomeSection: {
    alignItems: "center",
    paddingVertical: 32,
    marginBottom: 24,
  },
  welcomeIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: P.surf2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 8,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: P.mute,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  reportOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.surf,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 8,
    elevation: 0,
    borderWidth: 1,
    borderColor: P.line,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: P.mute,
    lineHeight: 20,
  },
  // Loading Overlay
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCard: {
    backgroundColor: P.surf,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    margin: 32,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 16,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: P.surf,
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0,
    shadowRadius: 24,
    elevation: 0, borderWidth: 1, borderColor: P.line,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 28,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: P.surf2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: P.mute,
    textAlign: "center",
    lineHeight: 20,
  },
  dateSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: P.ink2,
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1.5,
    borderColor: P.line,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: P.bg,
    color: P.ink,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: P.surf2,
    borderWidth: 1,
    borderColor: P.line,
  },
  cancelButtonText: {
    color: P.mute,
    fontWeight: "600",
    fontSize: 15,
  },
  generateButton: {
    backgroundColor: P.solid,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonText: {
    color: P.onSolid,
    fontWeight: "600",
    fontSize: 15,
  },
}));

export default ReportScreen;
