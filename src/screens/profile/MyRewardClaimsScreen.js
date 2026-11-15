import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Text } from "../../components/pulse/Text";
import { P, themedStyles } from "../../theme/theme";
import { ScreenHeader, ScreenSkeleton, Icon } from "../../components/pulse";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../config/FirebaseConfig";
import { getPremiumRewardClaims } from "../../services/premiumRewardsService";
import { useNavigation } from "@react-navigation/native";

export default function MyRewardClaimsScreen() {
  const navigation = useNavigation();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClaims = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userClaims = await getPremiumRewardClaims(uid);
      setClaims(userClaims);
    } catch (error) {
      console.error("Error fetching user claims:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClaims();
    const unsubscribe = navigation.addListener("focus", () => {
      fetchClaims(false);
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClaims(false);
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "Pending":
        return {
          bg: P.amberSoft,
          text: P.amber,
          icon: "time-outline"
        };
      case "Approved":
        return {
          bg: P.surf2,
          text: P.primary,
          icon: "checkmark-circle-outline"
        };
      case "Completed":
        return {
          bg: P.posSoft,
          text: P.pos,
          icon: "gift-outline"
        };
      case "Rejected":
        return {
          bg: P.negSoft,
          text: P.neg,
          icon: "close-circle-outline"
        };
      default:
        return {
          bg: P.surf2,
          text: P.mute,
          icon: "help-circle-outline"
        };
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const renderClaimItem = ({ item }) => {
    const statusCfg = getStatusConfig(item.status);
    const requestedDate = formatDate(item.createdAt);
    const completedDate = item.completedAt ? formatDate(item.completedAt) : null;

    return (
      <View style={styles.claimCard}>
        <View style={styles.cardHeader}>
          <View style={styles.rewardTitleContainer}>
            <Icon name="gift" size={20} color={P.primary} style={{ marginRight: 8 }} />
            <Text style={styles.rewardTitle} numberOfLines={1}>{item.rewardName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Ionicons name={statusCfg.icon} size={12} color={statusCfg.text} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: statusCfg.text }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Coins Required:</Text>
            <Text style={styles.coinsValue}>{item.coinsRequired?.toLocaleString("en-IN")} coins</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Requested Date:</Text>
            <Text style={styles.detailValue}>{requestedDate}</Text>
          </View>

          {completedDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Completed Date:</Text>
              <Text style={styles.detailValue}>{completedDate}</Text>
            </View>
          )}

          {item.status === "Rejected" && item.rejectedReason ? (
            <View style={styles.rejectionContainer}>
              <Ionicons name="alert-circle-outline" size={16} color={P.neg} style={{ marginRight: 6, marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
                <Text style={styles.rejectionText}>{item.rejectedReason}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader overline="Rewards" title="My reward claims" />

      {loading ? (
        <ScreenSkeleton rows={4} />
      ) : claims.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="gift" size={64} color={P.mute} />
          <Text style={styles.emptyText}>No reward claims yet</Text>
          <Text style={styles.emptySub}>Accumulate coins and redeem premium rewards to see your claim history here.</Text>
        </View>
      ) : (
        <FlatList
          data={claims}
          keyExtractor={(item) => item.id}
          renderItem={renderClaimItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[P.solid]} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: P.surf,
    borderBottomWidth: 1,
    borderBottomColor: P.line
  },
  backButton: {
    padding: 4
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: P.ink
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  loadingText: {
    marginTop: 12,
    color: P.mute,
    fontSize: 14
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: P.ink2,
    marginTop: 16
  },
  emptySub: {
    fontSize: 14,
    color: P.mute,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32
  },
  listContent: {
    padding: 16
  },
  claimCard: {
    backgroundColor: P.surf,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: P.line,
    shadowColor: "#0C110E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 6,
    elevation: 0
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: P.line,
    paddingBottom: 12,
    marginBottom: 12
  },
  rewardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8
  },
  rewardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: P.ink,
    flex: 1
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700"
  },
  cardDetails: {
    gap: 8
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  detailLabel: {
    fontSize: 13,
    color: P.mute
  },
  detailValue: {
    fontSize: 13,
    color: P.ink2,
    fontWeight: "500"
  },
  coinsValue: {
    fontSize: 13,
    color: P.amber,
    fontWeight: "700"
  },
  rejectionContainer: {
    flexDirection: "row",
    backgroundColor: P.negSoft,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: P.negSoft
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: P.neg
  },
  rejectionText: {
    fontSize: 12,
    color: P.neg,
    marginTop: 2
  }
}));
