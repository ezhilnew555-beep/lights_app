import React, { useState, useEffect, useCallback, useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  ScrollView,
} from "react-native";
import { Text, TextInput } from "../../components/pulse/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { filterIndianStocks, INDIAN_STOCKS_MASTER } from "../../data/indianStocksData";
import * as yahooFinanceService from "../../services/yahooFinanceService";
import { COLORS, P, themedStyles } from "../../theme/theme";
import { ScreenHeader, ClockLoader, Icon, Press } from "../../components/pulse";

import { toast } from "../../ux/toast";
// Helper functions for formatting
const formatCurrency = (value) => {
  if (value === null || value === undefined) return "N/A";
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPercentage = (value) => {
  if (value === null || value === undefined) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${Number(value).toFixed(2)}%`;
};

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const EXCHANGE_OPTIONS = [
  { key: "ALL", label: "All Indian" },
  { key: "NSE", label: "NSE" },
  { key: "BSE", label: "BSE" },
  { key: "NIFTY50", label: "Nifty 50" },
  { key: "LARGE_CAP", label: "Large Cap" },
  { key: "MID_CAP", label: "Mid & Small" },
];

const StockSearchScreen = () => {
  const navigation = useNavigation();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState("ALL");
  const [quotesMap, setQuotesMap] = useState({});

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const debouncedSearch = useCallback(
    debounce((searchTerm, exchange) => {
      fetchCompanies(searchTerm, 1, true, true, exchange);
    }, 400),
    []
  );

  useEffect(() => {
    if (searchText.trim() === "") {
      fetchCompanies("", 1, true, true, selectedExchange);
    } else {
      debouncedSearch(searchText, selectedExchange);
    }
  }, [searchText, selectedExchange, debouncedSearch]);

  const fetchCompanies = async (
    search = "",
    page = 1,
    resetList = false,
    showLoading = true,
    exchange = selectedExchange
  ) => {
    try {
      if (showLoading && resetList) {
        setLoading(true);
      } else if (!resetList) {
        setLoadingMore(true);
      }

      const query = search.trim();

      // 1. If searching a query, first check live Yahoo Finance + local
      if (query.length > 0) {
        const liveResults = await yahooFinanceService.searchStocks(query);
        let filtered = liveResults;

        if (exchange === "NSE") {
          filtered = liveResults.filter((s) => s.symbol.endsWith(".NS") || s.exchange === "NSE");
        } else if (exchange === "BSE") {
          filtered = liveResults.filter((s) => s.symbol.endsWith(".BO") || s.bseSymbol || s.exchange === "BSE");
        } else if (exchange === "NIFTY50") {
          filtered = liveResults.filter((s) => s.isNifty50 || INDIAN_STOCKS_MASTER.some(m => m.symbol === s.symbol && m.isNifty50));
        }

        const pageSize = 25;
        const total = filtered.length;
        const totalPgs = Math.ceil(total / pageSize) || 1;
        const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

        if (resetList) {
          setCompanies(pageData);
        } else {
          setCompanies((prev) => [...prev, ...pageData]);
        }

        setCurrentPage(page);
        setTotalPages(totalPgs);
        setTotalCompanies(total);
        setHasNext(page < totalPgs);

        // Fetch live quotes for visible items asynchronously
        fetchVisibleQuotes(pageData);
      } else {
        // 2. Filter local Indian stock universe
        const response = filterIndianStocks({
          search: "",
          exchange,
          page,
          limit: 25,
        });

        if (resetList) {
          setCompanies(response.stocks);
        } else {
          setCompanies((prev) => [...prev, ...response.stocks]);
        }

        setCurrentPage(response.currentPage);
        setTotalPages(response.totalPages);
        setTotalCompanies(response.total);
        setHasNext(response.hasNext);

        // Fetch live quotes for visible items
        fetchVisibleQuotes(response.stocks);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const fetchVisibleQuotes = async (stockList) => {
    if (!stockList || stockList.length === 0) return;
    try {
      const symbolsToFetch = stockList.slice(0, 15).map((s) => s.symbol);
      const quotes = await yahooFinanceService.getMultipleQuotes(symbolsToFetch);
      const map = {};
      for (const q of quotes) {
        if (q && q.symbol) {
          map[q.symbol] = {
            price: q.regularMarketPrice,
            changePercent: q.dayChangePercent,
            dayChange: q.dayChange,
          };
        }
      }
      setQuotesMap((prev) => ({ ...prev, ...map }));
    } catch (err) {
      // Ignore quote fetching background error
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchCompanies(searchText, 1, true, false, selectedExchange);
  };

  const loadMore = () => {
    if (!loadingMore && hasNext) {
      fetchCompanies(searchText, currentPage + 1, false, false, selectedExchange);
    }
  };

  const navigateToDetail = async (company) => {
    try {
      const cleanSymbol = company.symbol?.replace(/\.(NS|BO)$/i, "") || company.symbol;
      const targetExchange = company.symbol?.endsWith(".BO") || selectedExchange === "BSE" ? "BSE" : "NSE";

      navigation.navigate("StockDetail", {
        symbol: cleanSymbol,
        company: {
          name: company.name || company.shortName || company.symbol,
          symbol: company.symbol,
          exchange: targetExchange,
          sector: company.sector,
        },
        exchange: targetExchange,
      });
    } catch (error) {
      toast.error("Failed to open stock details. Please try again.");
    }
  };

  const renderCompanyItem = ({ item }) => {
    const quote = quotesMap[item.symbol];
    const displayPrice = quote?.price ?? item.basePrice;
    const changePercent = quote?.changePercent;
    const isPositive = (changePercent ?? 0) >= 0;
    const cleanTicker = item.symbol?.replace(/\.(NS|BO)$/i, "") || item.symbol;
    const isBSE = item.symbol?.endsWith(".BO");

    return (
      <Press scaleTo={0.96}
        style={styles.companyCard}
        onPress={() => navigateToDetail(item)}
        activeOpacity={0.75}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.symbolBadge, isBSE && styles.bseSymbolBadge]}>
            <Text style={[styles.symbolText, isBSE && styles.bseSymbolText]}>
              {cleanTicker.slice(0, 5)}
            </Text>
          </View>
          <View style={styles.companyTextGroup}>
            <Text style={styles.companyName} numberOfLines={1}>
              {item.name || item.shortName || item.longName || item.symbol}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.typePill}>
                <Text style={styles.typeText}>{item.sector || "Equity"}</Text>
              </View>
              <View style={[styles.exchangePill, isBSE && styles.bseExchangePill]}>
                <Text style={[styles.exchangePillText, isBSE && styles.bseExchangePillText]}>
                  {isBSE ? "BSE" : "NSE"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.cardRight}>
          {displayPrice ? (
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>{formatCurrency(displayPrice)}</Text>
              {changePercent !== undefined && (
                <View
                  style={[
                    styles.changePill,
                    { backgroundColor: isPositive ? P.posSoft : P.negSoft },
                  ]}
                >
                  <Ionicons
                    name={isPositive ? "caret-up" : "caret-down"}
                    size={11}
                    color={isPositive ? P.pos : P.neg}
                  />
                  <Text
                    style={[
                      styles.changePillText,
                      { color: isPositive ? P.pos : P.neg },
                    ]}
                  >
                    {formatPercentage(changePercent)}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.arrowButton}>
              <Icon name="chevron" size={16} color={COLORS.primary} />
            </View>
          )}
        </View>
      </Press>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Nav Row */}
      <ScreenHeader style={{ paddingHorizontal: 0, paddingTop: 0 }} overline="NSE & BSE" title="All companies" />

      {/* Search Box */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color={COLORS.primary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by company, ticker (e.g. Tata, Reliance, Zomato)..."
          placeholderTextColor={P.mute}
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <Press scaleTo={0.96} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Clear search"
            style={styles.clearButton}
            onPress={() => setSearchText("")}
          >
            <Icon name="close" size={18} color={P.mute} />
          </Press>
        )}
      </View>

      {/* Exchange & Category Tabs */}
      <View style={styles.exchangeSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exchangeScrollContent}>
          {EXCHANGE_OPTIONS.map((ex) => (
            <Press scaleTo={0.96} activeOpacity={0.7}
              key={ex.key}
              style={[
                styles.exchangeButton,
                selectedExchange === ex.key && styles.selectedExchangeButton,
              ]}
              onPress={() => setSelectedExchange(ex.key)}
            >
              <Text
                style={[
                  styles.exchangeButtonText,
                  selectedExchange === ex.key && styles.selectedExchangeButtonText,
                ]}
              >
                {ex.label}
              </Text>
            </Press>
          ))}
        </ScrollView>
      </View>

      {/* Stats row */}
      {totalCompanies > 0 && (
        <View style={styles.statsRow}>
          <Ionicons name="layers-outline" size={13} color={COLORS.primary} />
          <Text style={styles.statsText}>
            {totalCompanies.toLocaleString()} Indian stocks • Page {currentPage}/{totalPages}
          </Text>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingMoreText}>Loading more stocks...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="search" size={44} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyText}>
        {searchText ? "No Indian stocks found" : "No stocks available"}
      </Text>
      <Text style={styles.emptySubtext}>
        {searchText
          ? `Try searching by ticker (e.g. INFY, TCS, HDFC, SUZLON)`
          : "Please try refreshing the list"}
      </Text>
      <Press scaleTo={0.96} activeOpacity={0.7}
        style={styles.retryButton}
        onPress={() => fetchCompanies(searchText, 1, true, true, selectedExchange)}
      >
        <Icon name="refresh" size={16} color={P.onSolid} />
        <Text style={styles.retryText}>Retry</Text>
      </Press>
    </View>
  );

  if (loading && companies.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
        <ClockLoader fill label="Loading NSE & BSE companies" sub="Connecting to the live market feed…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      {renderHeader()}
      <FlatList
        data={companies}
        renderItem={renderCompanyItem}
        keyExtractor={(item, index) => `${item.symbol}-${index}`}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primaryFill]}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  listContent: { paddingTop: 8, paddingBottom: 50 },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: P.bg,
  },
  loadingCard: {
    backgroundColor: P.surf,
    borderRadius: 24,
    padding: 36,
    alignItems: "center",
    width: "80%",
    elevation: 0,
    borderWidth: 1,
    borderColor: P.line, shadowOpacity: 0,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: P.ink,
    fontWeight: "700",
  },
  loadingSubtext: {
    marginTop: 6,
    fontSize: 13,
    color: P.mute,
    fontWeight: "500",
    textAlign: "center",
  },

  header: {
    backgroundColor: P.bg,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 0,
    borderBottomColor: P.line,
    elevation: 0, paddingHorizontal: 16, shadowOpacity: 0,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: P.ink,
  },
  headerSubtitle: {
    fontSize: 12,
    color: P.mute,
    fontWeight: "500",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.surf2,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: P.line,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: P.ink,
    fontWeight: "500",
  },
  clearButton: { marginLeft: 6 },

  exchangeSelector: {
    marginBottom: 10,
  },
  exchangeScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  exchangeButton: {
    backgroundColor: P.surf2,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: P.line,
  },
  selectedExchangeButton: {
    backgroundColor: COLORS.primaryFill,
    borderColor: COLORS.primary,
  },
  exchangeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: P.mute,
  },
  selectedExchangeButtonText: {
    color: P.onSolid,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 6,
  },
  statsText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },

  companyCard: {
    backgroundColor: P.surf,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: P.line,
    elevation: 0, shadowOpacity: 0,
  },
  cardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  symbolBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
  },
  bseSymbolBadge: {
    backgroundColor: P.invSoft,
  },
  symbolText: {
    fontSize: 11,
    fontWeight: "800",
    color: P.primary,
    letterSpacing: 0.3,
  },
  bseSymbolText: {
    color: P.inv,
  },
  companyTextGroup: { flex: 1 },
  companyName: {
    fontSize: 14,
    color: P.ink,
    fontWeight: "600",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typePill: {
    backgroundColor: P.surf2,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  typeText: {
    fontSize: 10,
    color: P.mute,
    fontWeight: "600",
  },
  exchangePill: {
    backgroundColor: P.surf2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  bseExchangePill: {
    backgroundColor: P.invSoft,
  },
  exchangePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: P.primary,
  },
  bseExchangePillText: {
    color: P.inv,
  },

  cardRight: {
    marginLeft: 10,
    alignItems: "flex-end",
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
    color: P.ink,
    marginBottom: 3,
  },
  changePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  changePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
  },

  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 12,
    color: P.mute,
    fontWeight: "500",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: P.surf2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: P.ink,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    color: P.mute,
    marginTop: 6,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryFill,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 8,
  },
  retryText: {
    color: P.onSolid,
    fontSize: 14,
    fontWeight: "700",
  },
}));

export default StockSearchScreen;
