import React, { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  StatusBar,
} from "react-native";
import { Text, TextInput } from "../../components/pulse/Text";
import { P, themedStyles } from "../../theme/theme";
import { ScreenHeader, Card, Mono, Overline, Badge, Field, ClockLoader, Press } from "../../components/pulse";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { EventRegister } from "react-native-event-listeners";
import { auth } from "../../config/FirebaseConfig";
import { getInvestments } from "../../services/firestoreService";
import {
  fetchAllMutualFunds,
  loadCachedCatalog,
  isCatalogStale,
} from "../../services/mutualFundApiService";

const LEGACY_CACHE_KEY = "mf_all_companies_cache_v2";
const SEARCH_DEBOUNCE_MS = 250;

/** "2026-09-25" -> "25 Sep 2026" */
const formatNavDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return iso || null;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
};

const NETWORK_TIMEOUT_MS = 20000;
const RETRY_ATTEMPTS = 6;
const RETRY_BASE_DELAY_MS = 2000;
const MIN_CACHE_SIZE = 500;

// Extract AMC/company name from scheme name (scheme starts with AMC name)
const extractCompanyName = (schemeName) => {
  if (!schemeName) return "Other";
  const knownAMCs = [
    "Axis", "Aditya Birla", "DSP", "Edelweiss", "Franklin", "HDFC",
    "HSBC", "ICICI", "IDBI", "IDFC", "Invesco", "ITI", "Kotak",
    "L&T", "LIC", "Mahindra", "Mirae", "Motilal", "Navi", "Nippon",
    "PGIM", "PPFAS", "Quant", "Quantum", "SBI", "Shriram", "Sundaram",
    "Tata", "Taurus", "Union", "UTI", "WhiteOak", "Samco",
  ];
  for (const amc of knownAMCs) {
    if (schemeName.toLowerCase().startsWith(amc.toLowerCase())) return amc + " Mutual Fund";
  }
  // Fallback: use the first two words
  const parts = schemeName.split(" ");
  return parts.slice(0, 2).join(" ");
};


const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

const parseAMFINavData = (rawText) => {
  if (!rawText || typeof rawText !== "string") return [];

  const lines = rawText.split(/\r?\n/);
  const schemes = [];

  for (const line of lines) {
    if (!line || !line.includes(";")) continue;
    if (line.startsWith("Scheme Code")) continue;

    const parts = line.split(";");
    if (parts.length < 6) continue;

    const schemeCode = parts[0]?.trim();
    const schemeName = parts[3]?.trim();
    const navRaw = parts[4]?.trim();
    const navDate = parts[5]?.trim();

    if (!/^\d+$/.test(schemeCode || "")) continue;
    if (!schemeName) continue;

    const nav = parseFloat(navRaw);

    schemes.push({
      schemeCode,
      schemeName,
      nav: Number.isFinite(nav) ? nav : 0,
      lastUpdated: navDate || null,
    });
  }

  return schemes;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryDelay = (attempt, retryAfterHeader = null) => {
  const retryAfterSeconds = Number(retryAfterHeader);
  if (!Number.isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  const expDelay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
  const jitter = Math.floor(Math.random() * 800);
  return Math.min(expDelay + jitter, 30000);
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = NETWORK_TIMEOUT_MS) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
};

const fetchJsonWithRetry = async (url, attempts = RETRY_ATTEMPTS) => {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
        }
      };
      const response = await fetchWithTimeout(url, options);
      if (!response.ok) {
        const shouldRetry = [429, 500, 502, 503, 504].includes(response.status);
        if (shouldRetry && attempt < attempts) {
          const waitMs = getRetryDelay(
            attempt,
            response.headers?.get?.("Retry-After")
          );
          console.log(
            `⚠️ Request failed (attempt ${attempt}/${attempts}) for ${url}. Retrying in ${Math.round(
              waitMs / 1000
            )}s...`
          );
          await sleep(waitMs);
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const waitMs = getRetryDelay(attempt);
        console.log(
          `⚠️ Request failed (attempt ${attempt}/${attempts}) for ${url}. Retrying in ${Math.round(
            waitMs / 1000
          )}s...`
        );
        await sleep(waitMs);
      }
    }
  }

  throw lastError;
};

// Removed legacy AMFI fetch helpers since we migrated to Yahoo Finance Search


const groupSchemesToSections = (schemes, investments) => {
  const companyMap = {};
  schemes.forEach((scheme) => {
    const companyName = scheme.fundHouse || extractCompanyName(scheme.schemeName);
    if (!companyMap[companyName]) companyMap[companyName] = [];
    companyMap[companyName].push({
      schemeCode: String(scheme.schemeCode),
      schemeName: scheme.schemeName,
      nav: scheme.nav,
      lastUpdated: scheme.lastUpdated,
    });
  });

  return Object.entries(companyMap)
    .map(([companyName, groupedSchemes]) => {
      const companyInvestments = investments.filter((inv) =>
        groupedSchemes.some(
          (s) =>
            inv.name === s.schemeName ||
            inv.schemeCode === s.schemeCode ||
            inv.description?.includes(s.schemeCode)
        )
      );
      return {
        companyName,
        data: groupedSchemes,
        investments: companyInvestments,
        lastUpdated: groupedSchemes[0]?.lastUpdated || null,
      };
    })
    .filter((c) => c.data.length > 0)
    .sort((a, b) => a.companyName.localeCompare(b.companyName));
};

const mapBackendCompaniesToSections = (backendCompanies, investments) => {
  if (!Array.isArray(backendCompanies)) return [];

  return backendCompanies
    .map((company) => {
      const schemes = Array.isArray(company.schemes)
        ? company.schemes.map((scheme) => ({
          schemeCode: String(scheme.schemeCode),
          schemeName: scheme.schemeName,
          nav: Number.isFinite(parseFloat(scheme.nav))
            ? parseFloat(scheme.nav)
            : 0,
          lastUpdated: scheme.lastUpdated || null,
        }))
        : [];

      const companyInvestments = investments.filter((inv) =>
        schemes.some(
          (s) =>
            inv.name === s.schemeName ||
            inv.schemeCode === s.schemeCode ||
            inv.description?.includes(s.schemeCode)
        )
      );

      return {
        companyName: company.companyName || "Other",
        data: schemes,
        investments: companyInvestments,
        lastUpdated: company.lastUpdated || schemes[0]?.lastUpdated || null,
      };
    })
    .filter((c) => c.data.length > 0)
    .sort((a, b) => a.companyName.localeCompare(b.companyName));
};

const filterSectionsByQuery = (sections, query) => {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return Array.isArray(sections) ? sections : [];

  return (Array.isArray(sections) ? sections : [])
    .map((section) => {
      const sectionName = String(section?.companyName || "").toLowerCase();
      const matchedCompany = sectionName.includes(normalizedQuery);

      const matchedSchemes = Array.isArray(section?.data)
        ? section.data.filter((scheme) => {
          const haystack = [
            scheme?.schemeName,
            scheme?.schemeCode,
            scheme?.lastUpdated,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedQuery);
        })
        : [];

      if (!matchedCompany && matchedSchemes.length === 0) return null;

      return {
        ...section,
        data: matchedCompany ? section.data : matchedSchemes,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.companyName.localeCompare(b.companyName));
};

const mapBackendFundsToSections = (funds, investments) => {
  if (!Array.isArray(funds)) return [];

  const companyMap = {};
  funds.forEach((fund) => {
    const companyName = extractCompanyName(fund.schemeName);
    if (!companyMap[companyName]) companyMap[companyName] = [];
    companyMap[companyName].push({
      schemeCode: String(fund.schemeCode),
      schemeName: fund.schemeName,
      nav: Number.isFinite(parseFloat(fund.nav)) ? parseFloat(fund.nav) : 0,
      lastUpdated: fund.lastUpdated || fund.date || null,
    });
  });

  return Object.entries(companyMap)
    .map(([companyName, schemes]) => {
      const companyInvestments = investments.filter((inv) =>
        schemes.some(
          (s) =>
            inv.name === s.schemeName ||
            inv.schemeCode === s.schemeCode ||
            inv.description?.includes(s.schemeCode)
        )
      );
      return {
        companyName,
        data: schemes,
        investments: companyInvestments,
        lastUpdated: schemes[0]?.lastUpdated || null,
      };
    })
    .filter((c) => c.data.length > 0)
    .sort((a, b) => a.companyName.localeCompare(b.companyName));
};

const parseMfapiAllFundsData = (payload) => {
  if (!Array.isArray(payload)) return [];

  const schemes = payload
    .map((item) => {
      const schemeCode = String(
        item?.schemeCode || item?.scheme_code || item?.code || ""
      ).trim();
      const schemeName = String(
        item?.schemeName || item?.scheme_name || item?.name || ""
      ).trim();
      const nav = parseFloat(item?.nav || item?.latestNAV || item?.latest_nav || 0);
      const lastUpdated =
        item?.lastUpdated || item?.date || item?.navDate || item?.updatedAt || null;

      if (!schemeCode || !schemeName) return null;

      return {
        schemeCode,
        schemeName,
        nav: Number.isFinite(nav) ? nav : 0,
        lastUpdated,
      };
    })
    .filter(Boolean);

  return schemes;
};

const MFScreen = () => {
  const [allFunds, setAllFunds] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef(null);
  const [displayedCompanies, setDisplayedCompanies] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingFundCode, setLoadingFundCode] = useState(null);
  const [query, setQuery] = useState("");
  const [updatingInBackground, setUpdatingInBackground] = useState(false);
  const ITEMS_PER_PAGE = 5;
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  /**
   * Fetches user's mutual fund investments from the server.
   */
  const fetchInvestments = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) { setInvestments([]); return; }
      const allInvestments = await getInvestments(uid, "Mutual Fund");
      console.log("💰 Found MF investments:", allInvestments.length);
      setInvestments(allInvestments);
    } catch (error) {
      console.error("Error fetching investments:", error);
      setInvestments([]);
    }
  };

  /**
   * Fetches mutual fund data from /mutualfunds/companies endpoint which returns
   * properly validated, deduplicated, and alphabetically sorted funds grouped by company.
   * Falls back to the public mfapi catalog when the backend is unavailable.
   */
  /**
   * Show the catalogue saved on this device immediately, then refresh it in
   * the background when it is older than a few hours. Only the very first
   * visit (nothing saved yet) waits on the network.
   */
  const fetchCompanies = async (forceRefresh = false) => {
    let shown = false;
    try {
      if (!forceRefresh) {
        const cached = await loadCachedCatalog();
        if (cached?.funds?.length) {
          setAllFunds(cached.funds);
          setLoading(false);
          shown = true;
          if (!isCatalogStale(cached.savedAt)) return;
          setUpdatingInBackground(true);
        }
      }
      const schemes = await fetchAllMutualFunds({ forceRefresh: true });
      if (Array.isArray(schemes) && schemes.length > 0) setAllFunds(schemes);
    } catch (error) {
      console.error("Error fetching mutual funds:", error);
      if (!shown) setAllFunds([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setUpdatingInBackground(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
    fetchCompanies();
    // The old AsyncStorage cache could never be written (too large); free the key.
    AsyncStorage.removeItem(LEGACY_CACHE_KEY).catch(() => {});
  }, []);

  // Debounce typing so ~9k schemes are not re-filtered on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchText), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchText]);

  // Grouping is the expensive step; it only reruns when the data changes.
  const sections = useMemo(() => groupSchemesToSections(allFunds, investments), [allFunds, investments]);

  useEffect(() => {
    const filteredSections = filterSectionsByQuery(sections, query);
    setAllCompanies(sections);
    setCompanies(filteredSections);
    setDisplayedCompanies(filteredSections);
  }, [sections, query]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchInvestments(), fetchCompanies(true)]).finally(() => {
      setRefreshing(false);
    });
  };

  // Open immediately: the catalogue row already carries the latest NAV and
  // the calculator loads the remaining fund details itself.
  const handleFundPress = useCallback(
    (fund) => navigation.navigate("MFCalculator", { fund }),
    [navigation]
  );

  const handleClearSearch = useCallback(() => {
    setSearchText("");
    setIsSearching(false);
  }, []);

  const renderSectionHeader = useCallback(({ section }) => {
    if (!section) return null;
    const held = section.investments?.length || 0;
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {section.companyName || "Other"}
        </Text>
        {held ? <Badge>{held} held</Badge> : null}
        <Overline>{section.data.length} funds</Overline>
      </View>
    );
  }, []);

  // Each fund house renders as one card: side borders on every row, rounded ends
  const renderFundItem = useCallback(
    ({ item, section, index }) => {
      if (!item) return null;
      const held = section?.investments?.some(
        (inv) => inv.name === item.schemeName || inv.schemeCode === item.schemeCode || inv.description?.includes(item.schemeCode)
      );
      const nav = parseFloat(item?.nav);
      const first = index === 0;
      const last = index === (section?.data?.length || 1) - 1;
      return (
        <View style={[styles.rowWrap, first && styles.rowFirst, last && styles.rowLast]}>
          <Press scaleTo={0.96}
            style={[styles.row, last && { borderBottomWidth: 0 }]}
            onPress={() => handleFundPress(item)}
            activeOpacity={0.7}
            accessibilityLabel={`${item.schemeName}, NAV ${Number.isFinite(nav) ? nav.toFixed(2) : "unknown"}`}
          >
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={styles.fundName} numberOfLines={2}>
                {item.schemeName}
              </Text>
              <Text mono style={styles.fundSub}>
                {held ? "● HELD · " : ""}#{item.schemeCode}
              </Text>
            </View>
            <View style={styles.navCol}>
              <Mono size={15}>{Number.isFinite(nav) && nav > 0 ? `₹${nav.toFixed(2)}` : "—"}</Mono>
              <Text mono style={styles.fundSub}>{formatNavDate(item.lastUpdated) || ""}</Text>
            </View>
          </Press>
        </View>
      );
    },
    [handleFundPress]
  );

  const renderEmptyState = useCallback(
    () => (
      <Card style={{ alignItems: "center", paddingVertical: 24 }}>
        <Text style={styles.emptyText}>
          {searchText ? `No funds match "${searchText}"` : "Could not load mutual funds. Pull to retry."}
        </Text>
      </Card>
    ),
    [searchText]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle={P.statusBar} backgroundColor={P.bg} />
      <ScreenHeader overline="Mutual funds" title="Browse all funds" />

      <View style={styles.searchWrap}>
        <Field
          label="Search funds"
          placeholder="Fund house, scheme or code"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {updatingInBackground ? (
          <View style={styles.bgUpdate}>
            <ActivityIndicator size="small" color={P.mute} />
            <Text style={styles.bgUpdateText}>Updating NAVs…</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <ClockLoader fill label="Loading mutual funds…" sub="First time only; the list is saved on your phone." />
      ) : (
        <SectionList
          sections={Array.isArray(displayedCompanies) ? displayedCompanies : []}
          keyExtractor={(item, index) => `${item?.schemeCode || "x"}-${index}`}
          renderItem={renderFundItem}
          renderSectionHeader={renderSectionHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContainer}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[P.ink]} tintColor={P.ink} />}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
        />
      )}
    </SafeAreaView>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: P.bg },
    searchWrap: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
    bgUpdate: { flexDirection: "row", alignItems: "center", gap: 8 },
    bgUpdateText: { fontSize: 12, color: P.mute },
    loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
    loadingText: { fontSize: 15, fontWeight: "600", color: P.ink },
    listContainer: { paddingHorizontal: 16, paddingBottom: 120 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, marginBottom: 8 },
    sectionTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: P.ink },
    rowWrap: { backgroundColor: P.surf, borderLeftWidth: 1, borderRightWidth: 1, borderColor: P.line, paddingHorizontal: 14 },
    rowFirst: { borderTopWidth: 1, borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingTop: 2 },
    rowLast: { borderBottomWidth: 1, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, paddingBottom: 2 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: P.line },
    fundName: { fontSize: 14, fontWeight: "600", color: P.ink, lineHeight: 19 },
    fundSub: { fontSize: 11, color: P.mute },
    navCol: { alignItems: "flex-end", gap: 3 },
    emptyText: { fontSize: 14, color: P.ink2, textAlign: "center" },
  })
);

export default MFScreen;
