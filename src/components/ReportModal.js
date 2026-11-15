import React, { useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Text, TextInput } from "./pulse/Text";
import { Ionicons } from "@expo/vector-icons";
import reportService from "../services/reportService";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, P, themedStyles } from "../theme/theme";

import { toast, friendlyError } from "../ux/toast";
import ToastHost from "./pulse/ToastHost";
import { PopupModal, PopupBackdrop, PopupPanel } from "./pulse/popup";
import { Icon, Press } from "./pulse";
const ReportModal = ({ visible, onClose, currentMonth, currentYear }) => {
  const [loading, setLoading] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

  const formatYMD = (year, month, day) => {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  };

  React.useEffect(() => {
    const year = parseInt(currentYear, 10);
    const month = parseInt(currentMonth, 10);
    setCustomStartDate(formatYMD(year, month, 1));
    setCustomEndDate(formatYMD(year, month, getDaysInMonth(year, month)));
  }, [currentMonth, currentYear]);

  const reportTypes = [
    {
      id: "monthly",
      title: "Monthly Report",
      description: `Generate report for ${getMonthName(
        currentMonth
      )} ${currentYear}`,
      icon: "calendar-outline",
      color: P.primary,
    },
    {
      id: "annual",
      title: "Annual Report",
      description: `Generate report for year ${currentYear}`,
      icon: "stats-chart-outline",
      color: P.pos,
    },
    {
      id: "quarterly",
      title: "Quarterly Report",
      description: "Generate report for current quarter",
      icon: "pie-chart-outline",
      color: P.amber,
    },
    {
      id: "custom",
      title: "Custom Period",
      description:
        customStartDate && customEndDate
          ? `Generate report from ${customStartDate} to ${customEndDate}`
          : "Generate report for selected period",
      icon: "filter-outline",
      color: P.inv,
    },
  ];

  function getMonthName(monthNum) {
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
    return months[parseInt(monthNum, 10) - 1];
  }

  const handleGenerateReport = async (reportType) => {
    try {
      setLoading(true);
      setSelectedReportType(reportType);

      switch (reportType) {
        case "monthly":
          await reportService.generateMonthlyReport(currentMonth, currentYear);
          break;
        case "annual":
          await reportService.generateAnnualReport(currentYear);
          break;
        case "quarterly":
          // Calculate quarter dates
          const quarter = Math.ceil(parseInt(currentMonth) / 3);
          const quarterStartMonth = (quarter - 1) * 3 + 1;
          const quarterEndMonth = quarter * 3;
          const startDate = `${currentYear}-${quarterStartMonth
            .toString()
            .padStart(2, "0")}-01`;
          const endDate = new Date(currentYear, quarterEndMonth, 0)
            .toISOString()
            .split("T")[0];
          await reportService.generateCustomReport(startDate, endDate);
          break;
        case "custom":
          if (!/^\d{4}-\d{2}-\d{2}$/.test(customStartDate)) {
            toast.warning("Start date must be in YYYY-MM-DD format", { title: "Invalid date" });
            return;
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(customEndDate)) {
            toast.warning("End date must be in YYYY-MM-DD format", { title: "Invalid date" });
            return;
          }
          if (new Date(customStartDate) > new Date(customEndDate)) {
            toast.warning("Start date cannot be after end date", { title: "Invalid range" });
            return;
          }
          await reportService.generateCustomReport(
            customStartDate,
            customEndDate
          );
          break;
      }

      toast.success("Your report is ready to share.", { title: "Report generated" });
      onClose?.();
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error(friendlyError(error, "The report couldn't be generated. Please try again."), {
        title: "Report failed",
      });
    } finally {
      setLoading(false);
      setSelectedReportType(null);
    }
  };

  return (
    <PopupModal toastHost={false}
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <PopupBackdrop style={styles.overlay}>
        <PopupPanel style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Download Reports</Text>
            <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={P.mute} />
            </Press>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>
              Choose the type of financial report you'd like to generate:
            </Text>

            {reportTypes.map((report) => (
              <Press scaleTo={0.96} activeOpacity={0.7}
                key={report.id}
                style={[
                  styles.reportOption,
                  loading &&
                    selectedReportType === report.id &&
                    styles.reportOptionLoading,
                ]}
                onPress={() => handleGenerateReport(report.id)}
                disabled={loading}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: report.color },
                  ]}
                >
                  <Ionicons name={report.icon} size={24} color={P.onSolid} />
                </View>
                <View style={styles.reportInfo}>
                  <Text style={styles.reportTitle}>{report.title}</Text>
                  <Text style={styles.reportDescription}>
                    {report.description}
                  </Text>
                </View>
                <View style={styles.actionContainer}>
                  {loading && selectedReportType === report.id ? (
                    <ActivityIndicator size="small" color={report.color} />
                  ) : (
                    <Icon
                      name="chevron"
                      size={20}
                      color={P.mute}
                    />
                  )}
                </View>
              </Press>
            ))}

            <View style={styles.customDateCard}>
              <Text style={styles.customDateTitle}>Custom Date Range</Text>
              <TextInput
                style={styles.customDateInput}
                value={customStartDate}
                onChangeText={setCustomStartDate}
                placeholder="Start date (YYYY-MM-DD)"
                autoCapitalize="none"
                editable={!loading}
              />
              <TextInput
                style={styles.customDateInput}
                value={customEndDate}
                onChangeText={setCustomEndDate}
                placeholder="End date (YYYY-MM-DD)"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={P.primary}
                />
                <Text style={styles.infoTitle}>Report Information</Text>
              </View>
              <Text style={styles.infoText}>
                • Reports are generated in PDF format with professional layout
                {"\n"}• Includes financial summary, transaction details, and
                category breakdowns{"\n"}• Features the LigthsON logo and company
                branding{"\n"}• Reports can be shared via email, messaging, or
                saved to device
              </Text>
            </View>
          </ScrollView>
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
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: P.surf,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    minHeight: "60%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: P.line,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: P.ink,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: P.mute,
    marginBottom: 24,
    lineHeight: 24,
  },
  reportOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.bg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: P.line,
  },
  reportOptionLoading: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: P.ink,
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: P.mute,
    lineHeight: 20,
  },
  actionContainer: {
    marginLeft: 12,
  },
  customDateCard: {
    backgroundColor: P.invSoft,
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: P.invSoft,
  },
  customDateTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: P.inv,
    marginBottom: 10,
  },
  customDateInput: {
    backgroundColor: P.surf,
    borderWidth: 1,
    borderColor: P.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: P.ink,
  },
  infoCard: {
    backgroundColor: P.surf2,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: P.line,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: P.primary,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: P.primary,
    lineHeight: 22,
  },
}));

export default ReportModal;
