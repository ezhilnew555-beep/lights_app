import React, { useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { Text } from "./pulse/Text";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import simpleReportService from "../services/simpleReportService";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, P, themedStyles } from "../theme/theme";
import { localISODate } from "../utils/format";
import { LigthsOnMark } from "./brand/LigthsOnLogo";

import { toast } from "../ux/toast";
import ToastHost from "./pulse/ToastHost";
import { PopupModal, PopupBackdrop, PopupPanel } from "./pulse/popup";
import { Icon, Press } from "./pulse";
const CustomReportModal = ({ visible, onClose, currentMonth, currentYear }) => {
  console.log(
    "=== CustomReportModal render - visible:",
    visible,
    "currentMonth:",
    currentMonth,
    "currentYear:",
    currentYear
  );
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const handleGenerateReport = async (reportType, preview = false) => {
    try {
      setLoading(true);
      let result;

      switch (reportType) {
        case "monthly":
          result = await simpleReportService.generateMonthlyReport(
            currentMonth,
            currentYear,
            preview
          );
          if (preview) {
            setPreviewData({
              type: "Monthly Report",
              period: `${getMonthName(currentMonth)} ${currentYear}`,
              data: result,
            });
            setShowReportPreview(true);
          } else {
            toast.success("Monthly report has been generated and shared!");
          }
          break;

        case "annual":
          result = await simpleReportService.generateAnnualReport(
            currentYear,
            preview
          );
          if (preview) {
            setPreviewData({
              type: "Annual Report",
              period: `Year ${currentYear}`,
              data: result,
            });
            setShowReportPreview(true);
          } else {
            toast.success("Annual report has been generated and shared!");
          }
          break;

        case "custom":
          if (fromDate > toDate) {
            toast.warning("From date cannot be later than To date");
            return;
          }

          const startDate = localISODate(fromDate);
          const endDate = localISODate(toDate);

          result = await simpleReportService.generateCustomReport(
            startDate,
            endDate,
            preview
          );
          if (preview) {
            setPreviewData({
              type: "Custom Report",
              period: `${formatDate(fromDate)} to ${formatDate(toDate)}`,
              data: result,
            });
            setShowReportPreview(true);
          } else {
            toast.success("Custom report has been generated and shared!");
          }
          break;
      }

      if (!preview) {
        onClose();
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getMonthName = (monthNumber) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[parseInt(monthNumber) - 1];
  };

  return (
    <PopupModal toastHost={false}
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <PopupBackdrop style={styles.overlay}>
        <PopupPanel placement="center" style={styles.modalContainer}>
          {!showReportPreview ? (
            <View style={styles.normalScreen}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <LigthsOnMark size={40} style={styles.logo} />
                  <View style={styles.headerText}>
                    <Text style={styles.title}>LigthsON</Text>
                    <Text style={styles.subtitle}>Financial Reports</Text>
                  </View>
                </View>
                <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
                  <Icon name="close" size={24} color={P.onSolid} />
                </Press>
              </View>

              {/* Report Options */}
              <ScrollView
                style={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sectionTitle}>Select Report Type</Text>

                {/* Monthly Report Option */}
                <View style={styles.reportOption}>
                  <View style={styles.optionLeft}>
                    <Icon
                      name="calendar"
                      size={24}
                      color={P.primary}
                    />
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>Monthly Report</Text>
                      <Text style={styles.optionDescription}>
                        {getMonthName(currentMonth)} {currentYear}
                      </Text>
                    </View>
                  </View>
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    style={styles.previewButton}
                    onPress={() => handleGenerateReport("monthly", true)}
                    disabled={loading}
                  >
                    <Icon name="eye" size={18} color={P.primary} />
                    <Text style={styles.previewButtonText}>Preview</Text>
                  </Press>
                </View>

                {/* Annual Report Option */}
                <View style={styles.reportOption}>
                  <View style={styles.optionLeft}>
                    <Icon name="calendar" size={24} color={P.pos} />
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>Annual Report</Text>
                      <Text style={styles.optionDescription}>
                        Year {currentYear}
                      </Text>
                    </View>
                  </View>
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    style={styles.previewButton}
                    onPress={() => handleGenerateReport("annual", true)}
                    disabled={loading}
                  >
                    <Icon name="eye" size={18} color={P.pos} />
                    <Text style={styles.previewButtonText}>Preview</Text>
                  </Press>
                </View>

                {/* Custom Report Option */}
                <View style={styles.reportOption}>
                  <View style={styles.optionLeft}>
                    <Icon
                      name="report"
                      size={24}
                      color={P.inv}
                    />
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>Custom Report</Text>
                      <Text style={styles.optionDescription}>
                        Select custom date range
                      </Text>
                    </View>
                  </View>
                  <Press scaleTo={0.96} activeOpacity={0.7}
                    style={styles.previewButton}
                    onPress={() => handleGenerateReport("custom", true)}
                    disabled={loading}
                  >
                    <Icon name="eye" size={18} color={P.inv} />
                    <Text style={styles.previewButtonText}>Preview</Text>
                  </Press>
                </View>

                {/* Custom Date Selection */}
                <View style={styles.customDateSection}>
                  <Text style={styles.customDateTitle}>Custom Date Range</Text>

                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>From Date:</Text>
                    <Press scaleTo={0.96} activeOpacity={0.7}
                      style={styles.dateButton}
                      onPress={() => setShowFromPicker(true)}
                    >
                      <Text style={styles.dateText}>
                        {formatDate(fromDate)}
                      </Text>
                      <Icon
                        name="calendar"
                        size={16}
                        color={P.mute}
                      />
                    </Press>
                  </View>

                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>To Date:</Text>
                    <Press scaleTo={0.96} activeOpacity={0.7}
                      style={styles.dateButton}
                      onPress={() => setShowToPicker(true)}
                    >
                      <Text style={styles.dateText}>{formatDate(toDate)}</Text>
                      <Icon
                        name="calendar"
                        size={16}
                        color={P.mute}
                      />
                    </Press>
                  </View>
                </View>
              </ScrollView>

              {/* Loading Indicator */}
              {loading && (
                <View style={styles.loadingOverlay}>
                  <Text style={styles.loadingText}>Generating Report...</Text>
                </View>
              )}

              {/* Date Pickers */}
              {showFromPicker && (
                <DateTimePicker
                  value={fromDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    setShowFromPicker(Platform.OS === "ios");
                    if (selectedDate) {
                      setFromDate(selectedDate);
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}

              {showToPicker && (
                <DateTimePicker
                  value={toDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    setShowToPicker(Platform.OS === "ios");
                    if (selectedDate) {
                      setToDate(selectedDate);
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}
            </View>
          ) : (
            // Report Preview Screen
            <View style={styles.previewContainer}>
              {/* Preview Header */}
              <View style={styles.previewHeader}>
                <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Back"
                  onPress={() => setShowReportPreview(false)}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color={P.mute} />
                </Press>
                <Text style={styles.previewTitle}>Report Preview</Text>
                <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
                  <Icon name="close" size={24} color={P.mute} />
                </Press>
              </View>

              {/* Professional Report Header */}
              <View style={styles.reportHeader}>
                <View style={styles.reportHeaderTop}>
                  <View style={styles.logoSection}>
                    <LigthsOnMark size={50} style={styles.reportLogo} />
                    <View style={styles.companyInfo}>
                      <Text style={styles.companyName}>LigthsON</Text>
                      <Text style={styles.companyTagline}>
                        Personal Finance Management
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportType}>{previewData?.type}</Text>
                    <Text style={styles.reportPeriod}>
                      {previewData?.period}
                    </Text>
                    <Text style={styles.reportDate}>
                      Generated: {new Date().toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Report Content Preview */}
              <ScrollView style={styles.previewContent}>
                <Text style={styles.previewNote}>
                  This is a preview of your financial report. The actual PDF
                  will contain detailed transaction tables, charts, and
                  comprehensive analysis.
                </Text>

                <View style={styles.summaryCards}>
                  <Text style={styles.sectionTitle}>Financial Summary</Text>
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Total Income</Text>
                      <Text style={[styles.summaryValue, styles.incomeColor]}>
                        ₹ 45,000
                      </Text>
                    </View>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Total Expenses</Text>
                      <Text style={[styles.summaryValue, styles.expenseColor]}>
                        ₹ 32,000
                      </Text>
                    </View>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Investments</Text>
                      <Text
                        style={[styles.summaryValue, styles.investmentColor]}
                      >
                        ₹ 8,000
                      </Text>
                    </View>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Net Savings</Text>
                      <Text style={[styles.summaryValue, styles.savingsColor]}>
                        ₹ 5,000
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Preview Actions */}
              <View style={styles.previewActions}>
                <Press scaleTo={0.96} activeOpacity={0.7}
                  style={[styles.actionButton, styles.shareButton]}
                  onPress={async () => {
                    try {
                      setLoading(true);
                      // Generate PDF for sharing
                      if (previewData?.type === "Monthly Report") {
                        await simpleReportService.shareReport(
                          "monthly",
                          currentMonth,
                          currentYear
                        );
                      } else if (previewData?.type === "Annual Report") {
                        await simpleReportService.shareReport(
                          "annual",
                          null,
                          currentYear
                        );
                      } else {
                        const startDate = localISODate(fromDate);
                        const endDate = localISODate(toDate);
                        await simpleReportService.shareReport(
                          "custom",
                          startDate,
                          endDate
                        );
                      }
                      toast.success("Report shared successfully!");
                    } catch (error) {
                      toast.error("Failed to share report. Please try again.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <Icon name="share" size={16} color={P.ink} />
                  <Text style={[styles.actionText, { color: P.ink }]}>Share</Text>
                </Press>
                <Press scaleTo={0.96} activeOpacity={0.7}
                  style={[styles.actionButton, styles.downloadButton]}
                  onPress={() => {
                    setShowReportPreview(false);
                    // Trigger actual download
                    if (previewData?.type === "Monthly Report") {
                      handleGenerateReport("monthly");
                    } else if (previewData?.type === "Annual Report") {
                      handleGenerateReport("annual");
                    } else {
                      handleGenerateReport("custom");
                    }
                  }}
                  disabled={loading}
                >
                  <Icon name="download" size={16} color={P.accInk} />
                  <Text style={styles.actionText}>Download PDF</Text>
                </Press>
              </View>
            </View>
          )}
        </PopupPanel>
      </PopupBackdrop>
      <ToastHost inModal />
    </PopupModal>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: P.surf,
    borderRadius: 20,
    width: "95%",
    maxWidth: 450,
    maxHeight: "90%",
    overflow: "hidden",
  },
  normalScreen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: P.solid,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: P.onSolid,
  },
  subtitle: {
    fontSize: 14,
    color: P.inv,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 20,
  },
  reportOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: P.bg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: P.line,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: P.ink,
  },
  optionDescription: {
    fontSize: 14,
    color: P.mute,
    marginTop: 2,
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.surf,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: P.line,
    gap: 4,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: P.ink2,
  },
  customDateSection: {
    backgroundColor: P.surf2,
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  customDateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: P.ink,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: P.ink2,
    width: 80,
  },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: P.surf,
    borderWidth: 1,
    borderColor: P.line,
    borderRadius: 8,
    padding: 12,
    marginLeft: 10,
  },
  dateText: {
    fontSize: 14,
    color: P.ink2,
    fontWeight: "500",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: P.ink2,
    marginTop: 10,
  },
  // Action Button Styles
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6, color: P.accInk,
  },
  downloadButton: {
    backgroundColor: P.acc,
  },
  shareButton: {
    backgroundColor: P.surf2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: P.accInk,
  },
  // Preview Styles
  previewContainer: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: P.solid,
  },
  backButton: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: P.onSolid,
  },
  reportHeader: {
    backgroundColor: P.solid,
    padding: 20,
  },
  reportHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  reportLogo: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 24,
    fontWeight: "bold",
    color: P.onSolid,
  },
  companyTagline: {
    fontSize: 14,
    color: P.inv,
    marginTop: 2,
  },
  reportInfo: {
    alignItems: "flex-end",
  },
  reportType: {
    fontSize: 18,
    fontWeight: "700",
    color: P.onSolid,
    textAlign: "right",
  },
  reportPeriod: {
    fontSize: 14,
    color: P.inv,
    marginTop: 2,
  },
  reportDate: {
    fontSize: 12,
    color: P.mute,
    marginTop: 4,
  },
  previewContent: {
    flex: 1,
    padding: 20,
  },
  previewNote: {
    backgroundColor: P.amberSoft,
    padding: 16,
    borderRadius: 8,
    fontSize: 14,
    color: P.amber,
    marginBottom: 20,
    lineHeight: 20,
  },
  summaryCards: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    backgroundColor: P.bg,
    borderRadius: 12,
    padding: 16,
    width: "48%",
    borderWidth: 1,
    borderColor: P.line,
  },
  summaryLabel: {
    fontSize: 12,
    color: P.mute,
    fontWeight: "500",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  incomeColor: {
    color: P.pos,
  },
  expenseColor: {
    color: P.neg,
  },
  investmentColor: {
    color: P.primary,
  },
  savingsColor: {
    color: P.inv,
  },
  previewActions: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: P.bg,
    gap: 12,
  },
}));

export default CustomReportModal;
