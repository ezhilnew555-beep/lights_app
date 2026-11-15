// Stocks (Pulse design, "stocks" artboard) — three tabs:
//   Portfolio  what you own, at live prices
//   Watchlist  what you plan to buy
//   Market     index cards, company search, sector filter, live list

import React, { useState, useEffect, useCallback, useMemo, useRef, memo, useLayoutEffect } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { INDIAN_STOCKS_MASTER } from "../../data/indianStocksData";
import * as yahooFinanceService from "../../services/yahooFinanceService";
import { useMarketIndices } from "../../services/marketIndices";
import { P, themedStyles } from "../../theme/theme";
import { inr, pct } from "../../utils/format";
import {
  Text,
  Mono,
  Overline,
  Chip,
  Field,
  Segmented,
  ScreenHeader,
  SectionHeader,
  ListRow,
  Card,
  Icon,
  SkeletonCard,
  Press,
} from "../../components/pulse";
import { PortfolioPanel, WatchlistPanel } from "../../components/StockTracker";
import { auth } from "../../config/FirebaseConfig";
import { getWatchlist, saveWatchlistItem, removeWatchlistItem } from "../../services/firestoreService";

import { toast } from "../../ux/toast";
const TABS = [
  { value: "portfolio", label: "Portfolio" },
  { value: "watchlist", label: "Watchlist" },
  { value: "market", label: "Market" },
];

const SECTORS = [
  { key: "ALL", label: "All" },
  { key: "NIFTY50", label: "Nifty 50" },
  { key: "Banking", label: "Banking" },
  { key: "Information Technology", label: "IT" },
  { key: "Automotive", label: "Auto" },
  { key: "Pharmaceuticals", label: "Pharma" },
  { key: "Energy", label: "Energy" },
  { key: "Defense", label: "Defence" },
  { key: "FMCG", label: "FMCG" },
  { key: "Real Estate", label: "Realty" },
];

const SORTS = [
  { value: "all", label: "All" },
  { value: "gainers", label: "Gainers" },
  { value: "losers", label: "Losers" },
];

// The default list shows each company once (NSE); search also finds BSE-only listings.
const DEFAULT_UNIVERSE = INDIAN_STOCKS_MASTER.filter((s) => s.exchange !== "BSE").slice(0, 30);

const clean = (sym) => String(sym || "").replace(/\.(NS|BO)$/i, "").toUpperCase();
const exchangeOf = (item) => (item.symbol?.endsWith(".BO") || item.exchange === "BSE" ? "BSE" : "NSE");

// ── Row ─────────────────────────────────────────────────────────────

const StockRow = memo(({ item, first, last, watched, onPress, onToggleWatch }) => {
  const change = item.changePercent || 0;
  const color = change > 0 ? P.pos : change < 0 ? P.neg : P.mute;
  const sym = clean(item.symbol);
  return (
    <View style={[styles.rowWrap, first && styles.rowFirst, last && styles.rowLast]}>
      <Press scaleTo={0.96}
        style={[styles.row, last && { borderBottomWidth: 0 }]}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
        accessibilityLabel={`${sym}, ${inr(item.price, { decimals: 2, reveal: true })}, ${pct(change)}`}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={styles.symLine}>
            <Text style={styles.sym}>{sym}</Text>
            <Text mono style={styles.exch}>{exchangeOf(item)}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {item.name || item.shortName || sym}
          </Text>
        </View>
        <View style={styles.priceCol}>
          <Mono size={15}>{item.price ? inr(item.price, { decimals: 2, reveal: true }) : "—"}</Mono>
          <Mono size={13} weight="400" color={color}>
            {pct(change, { decimals: 2 })}
          </Mono>
        </View>
        <Press scaleTo={0.96} activeOpacity={0.7}
          onPress={() => onToggleWatch(item)}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
          style={styles.star}
          accessibilityRole="button"
          accessibilityLabel={watched ? `Remove ${sym} from watchlist` : `Add ${sym} to watchlist`}
        >
          <Text style={{ fontSize: 18, color: watched ? P.amber : P.mute }}>{watched ? "★" : "☆"}</Text>
        </Press>
      </Press>
    </View>
  );
});
StockRow.displayName = "StockRow";

const IndexCards = () => {
  const { indices } = useMarketIndices();
  const shown = ["^NSEI", "^BSESN"].map((s) => indices.find((i) => i.symbol === s)).filter(Boolean);
  if (!shown.length) return null;
  return (
    <View style={styles.indexRow}>
      {shown.map((ix) => (
        <Card key={ix.symbol} style={{ flex: 1 }}>
          <View style={{ gap: 4 }}>
            <Overline>{ix.name}</Overline>
            <Mono size={17}>{ix.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Mono>
            <Mono size={13} weight="400" color={ix.changePct >= 0 ? P.pos : P.neg}>
              {pct(ix.changePct, { decimals: 2 })}
            </Mono>
          </View>
        </Card>
      ))}
    </View>
  );
};

// ── Screen ──────────────────────────────────────────────────────────

const StocksScreen = () => {
  const navigation = useNavigation();
  const [tab, setTab] = useState("portfolio");

  const [allStocks, setAllStocks] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("ALL");
  const [sort, setSort] = useState("all");
  const searchId = useRef(0);

  const [watchlist, setWatchlist] = useState([]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // ── Watchlist ──
  const loadWatchlist = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      setWatchlist(await getWatchlist(uid));
    } catch (e) {
      console.warn("Watchlist load failed", e?.message);
    }
  }, []);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  const watchedSet = useMemo(() => new Set(watchlist.map((w) => w.symbol)), [watchlist]);

  const toggleWatch = useCallback(
    async (item) => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const symbol = clean(item.symbol);
      try {
        if (watchedSet.has(symbol)) await removeWatchlistItem(uid, symbol);
        else
          await saveWatchlistItem(uid, {
            symbol,
            name: item.name || item.shortName || symbol,
            exchange: exchangeOf(item),
            addedPrice: item.price || item.basePrice,
          });
        loadWatchlist();
      } catch (e) {
        toast.warning(e?.message || "Could not update your watchlist.", { title: "Watchlist" });
      }
    },
    [watchedSet, loadWatchlist]
  );

  // ── Market data ──
  const withQuotes = async (list) => {
    const quotes = await yahooFinanceService.getMultipleQuotes(list.map((s) => s.symbol));
    const by = {};
    quotes.forEach((q) => q?.symbol && (by[q.symbol] = q));
    return list.map((s) => {
      const q = by[s.symbol];
      return { ...s, price: q?.regularMarketPrice || s.basePrice, changePercent: q?.dayChangePercent || 0 };
    });
  };

  const loadMarket = useCallback(async () => {
    try {
      setAllStocks(await withQuotes(DEFAULT_UNIVERSE));
    } catch (e) {
      setAllStocks(DEFAULT_UNIVERSE);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMarket();
  }, [loadMarket]);

  // Debounced live search across all NSE / BSE listings
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      searchId.current += 1;
      setSearchLoading(false);
      setResults([]);
      return;
    }
    const id = ++searchId.current;
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const found = (await yahooFinanceService.searchStocks(q)).slice(0, 15).map((s) => ({
          symbol: s.symbol,
          name: s.shortName || s.longName || s.symbol,
          sector: s.sector,
          exchange: s.symbol?.endsWith(".BO") ? "BSE" : "NSE",
          basePrice: s.basePrice,
        }));
        const priced = await withQuotes(found);
        if (id === searchId.current) setResults(priced);
      } catch (e) {
        if (id === searchId.current) setResults([]);
      } finally {
        if (id === searchId.current) setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const list = useMemo(() => {
    let l = query.trim() ? results : allStocks;
    if (!query.trim() && sector !== "ALL") {
      l = sector === "NIFTY50" ? l.filter((s) => s.isNifty50) : l.filter((s) => s.sector?.toLowerCase().includes(sector.toLowerCase()));
    }
    if (sort === "gainers") l = l.filter((s) => (s.changePercent || 0) > 0).sort((a, b) => b.changePercent - a.changePercent);
    if (sort === "losers") l = l.filter((s) => (s.changePercent || 0) < 0).sort((a, b) => a.changePercent - b.changePercent);
    return l;
  }, [query, results, allStocks, sector, sort]);

  const openDetail = useCallback(
    (item) =>
      navigation.navigate("StockDetail", {
        symbol: clean(item.symbol),
        exchange: exchangeOf(item),
        company: { name: item.name || item.shortName || item.symbol, symbol: item.symbol, exchange: exchangeOf(item), sector: item.sector },
      }),
    [navigation]
  );

  const renderItem = useCallback(
    ({ item, index }) => (
      <StockRow
        item={item}
        first={index === 0}
        last={index === list.length - 1}
        watched={watchedSet.has(clean(item.symbol))}
        onPress={openDetail}
        onToggleWatch={toggleWatch}
      />
    ),
    [list.length, watchedSet, openDetail, toggleWatch]
  );

  const marketHeader = (
    <View style={styles.marketHeader}>
      <IndexCards />
      <Field
        label="Search companies"
        placeholder="Search NSE and BSE companies"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {!query.trim() ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SECTORS.map((s) => (
            <Chip key={s.key} label={s.label} selected={sector === s.key} onPress={() => setSector(s.key)} />
          ))}
        </ScrollView>
      ) : null}
      <Segmented options={SORTS} value={sort} onChange={setSort} />
      {searchLoading ? <ActivityIndicator color={P.ink} /> : null}
    </View>
  );

  const marketFooter = (
    <View style={{ gap: 14, marginTop: 18 }}>
      <SectionHeader title="Breakout signals" action="Open" onAction={() => navigation.navigate("BreakoutStocksScreen")} />
      <Card style={{ paddingVertical: 2 }}>
        <ListRow
          title="Today's breakout stocks"
          subtitle="Technical pivots with T1 · T2 · T3 targets"
          left={<Icon name="bolt" size={20} color={P.ink} />}
          onPress={() => navigation.navigate("BreakoutStocksScreen")}
          chevron
          last
        />
      </Card>
      <Text style={styles.footnote}>Prices from Yahoo Finance, delayed up to 15 minutes. Not investment advice.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <ScreenHeader overline="NSE & BSE" title="Stocks" />
      <View style={styles.tabs}>
        <Segmented options={TABS} value={tab} onChange={setTab} height={40} fontSize={14} />
      </View>

      {tab === "portfolio" ? (
        <PortfolioPanel navigation={navigation} onBrowse={() => setTab("market")} />
      ) : tab === "watchlist" ? (
        <WatchlistPanel navigation={navigation} items={watchlist} onChanged={loadWatchlist} onBrowse={() => setTab("market")} />
      ) : loading ? (
        <SkeletonCard rows={6} style={{ marginHorizontal: 16, marginTop: 8 }} />
      ) : (
        <FlatList
          data={list}
          renderItem={renderItem}
          keyExtractor={(item, i) => `${item.symbol}-${i}`}
          ListHeaderComponent={marketHeader}
          ListFooterComponent={marketFooter}
          ListEmptyComponent={
            <Card style={{ alignItems: "center", paddingVertical: 24 }}>
              <Text style={styles.empty}>{query ? `No results for "${query}"` : "Nothing matches this filter"}</Text>
            </Card>
          }
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadMarket();
              }}
              tintColor={P.ink}
              colors={[P.ink]}
            />
          }
          initialNumToRender={12}
          windowSize={7}
        />
      )}
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: P.bg },
    tabs: { paddingHorizontal: 16, paddingBottom: 12 },
    list: { paddingHorizontal: 16, paddingBottom: 120 },
    marketHeader: { gap: 14, marginBottom: 14 },
    indexRow: { flexDirection: "row", gap: 10 },
    chips: { gap: 8 },
    // Rows render as one continuous card: side borders on every row, rounded ends
    rowWrap: {
      backgroundColor: P.surf,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: P.line,
      paddingHorizontal: 14,
    },
    rowFirst: { borderTopWidth: 1, borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingTop: 4 },
    rowLast: { borderBottomWidth: 1, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, paddingBottom: 4 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: P.line },
    symLine: { flexDirection: "row", alignItems: "center", gap: 6 },
    sym: { fontSize: 15, fontWeight: "700", color: P.ink },
    exch: { fontSize: 10, color: P.mute },
    name: { fontSize: 13, color: P.ink2 },
    priceCol: { alignItems: "flex-end", gap: 2, minWidth: 92 },
    star: { paddingLeft: 2 },
    footnote: { fontSize: 12, color: P.mute, textAlign: "center" },
    empty: { fontSize: 14, color: P.ink2 },
  })
);

export default StocksScreen;
