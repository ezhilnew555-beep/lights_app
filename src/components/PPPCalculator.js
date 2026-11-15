import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text, Card, Overline, Mono, Field, Segmented, SectionHeader, SelectField } from "./pulse";
import { P, themedStyles } from "../theme/theme";

import { PPP_DATA, INDIA_PPP_INDEX } from "../data/pppData";

const formatCurrency = (value) => {
  if (!value || value === "0.00") return "0";
  return parseFloat(value).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const PPPCalculator = ({ fireNumber }) => {
  const [pppToggleOn, setPppToggleOn] = useState(true);
  const [pppManualAmount, setPppManualAmount] = useState("");
  const [pppTargetCountry, setPppTargetCountry] = useState("USA");

  // Live API States
  const [livePppData, setLivePppData] = useState(PPP_DATA);
  const [indiaPppIndex, setIndiaPppIndex] = useState(INDIA_PPP_INDEX);
  const [isFetchingPpp, setIsFetchingPpp] = useState(true);

  useEffect(() => {
    const fetchLivePppData = async () => {
      try {
        // Fetching latest robust PPP data from World Bank API
        const response = await fetch("https://api.worldbank.org/v2/country/all/indicator/PA.NUS.PPP?format=json&date=2022&per_page=300");
        const json = await response.json();

        if (json && json[1] && Array.isArray(json[1])) {
          const fetchedData = json[1]
            .filter(d => d.value !== null && !d.country.value.includes("income") && !d.country.value.includes("dividend") && !d.country.value.includes("IDA") && !d.country.value.includes("IBRD") && !d.country.value.includes("Sub-Saharan") && d.country.value !== "World")
            .map(d => {
              // Map World Bank country names to our PPP_DATA names for better symbol matching
              const nameMatches = {
                "United States": "USA",
                "United Kingdom": "UK",
                "United Arab Emirates": "UAE",
                "Russian Federation": "Russia",
                "Turkiye": "Turkey",
                "Egypt, Arab Rep.": "Egypt",
                "Korea, Rep.": "South Korea",
                "Iran, Islamic Rep.": "Iran",
              };
              const searchName = nameMatches[d.country.value] || d.country.value;
              const fallbackItem = PPP_DATA.find(f => f.country === searchName);
              
              let sym = fallbackItem ? fallbackItem.symbol : "";
              if (!sym && d.countryiso3code) {
                  sym = d.countryiso3code + " ";
              }
              
              return {
                country: d.country.value,
                index: d.value,
                symbol: sym
              };
            });

          const sorted = fetchedData.sort((a, b) => a.country.localeCompare(b.country));
          const india = sorted.find(d => d.country === "India");

          if (sorted.length > 0) {
            setLivePppData(sorted);
            if (india) setIndiaPppIndex(india.index);
            // Auto-select USA if available
            if (sorted.find(c => c.country === "United States")) {
              setPppTargetCountry("United States");
            }
          }
        }
      } catch (error) {
        console.log("Error fetching live PPP data, using fallback.", error);
      } finally {
        setIsFetchingPpp(false);
      }
    };

    fetchLivePppData();
  }, []);

  const getPppConvertedValue = () => {
    const targetData = livePppData.find(c => c.country === pppTargetCountry) || livePppData[0];
    const amountInIndia = pppToggleOn ? parseFloat(fireNumber || 0) : parseFloat(pppManualAmount || 0);
    if (isNaN(amountInIndia) || amountInIndia <= 0) return { value: "0", symbol: targetData?.symbol || "" };

    const converted = (amountInIndia / indiaPppIndex) * targetData.index;
    return {
      value: converted.toFixed(0),
      symbol: targetData.symbol || ""
    };
  };

  const result = getPppConvertedValue();

  return (
    <View style={{ gap: 14 }}>
      <SectionHeader title="Living cost abroad" action={isFetchingPpp ? "Updating…" : null} />
      <Card style={{ gap: 14 }}>
        <Segmented
          options={[
            { value: "fire", label: "My F.I.R.E. number" },
            { value: "custom", label: "Custom amount" },
          ]}
          value={pppToggleOn ? "fire" : "custom"}
          onChange={(v) => setPppToggleOn(v === "fire")}
        />
        {pppToggleOn ? (
          <View style={{ gap: 4 }}>
            <Overline>Amount in India</Overline>
            <Mono size={18}>₹{formatCurrency(fireNumber)}</Mono>
          </View>
        ) : (
          <Field
            label="Amount in India (₹)"
            value={pppManualAmount}
            onChangeText={setPppManualAmount}
            keyboardType="numeric"
            placeholder="e.g. 5,00,00,000"
          />
        )}
        <SelectField
          label="Country"
          value={pppTargetCountry}
          onChange={setPppTargetCountry}
          title="Compare with"
          options={livePppData.map((c) => ({ value: c.country, label: c.country }))}
        />
        <View style={styles.result}>
          <Overline>Same lifestyle in {pppTargetCountry}</Overline>
          <Mono size={30} weight="700" style={{ letterSpacing: -0.9 }} numberOfLines={1} adjustsFontSizeToFit>
            {result.symbol}
            {formatCurrency(result.value)}
          </Mono>
          <Text style={styles.note}>Adjusted for purchasing power parity (World Bank), not exchange rates.</Text>
        </View>
      </Card>
    </View>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    result: { gap: 6, paddingTop: 14, borderTopWidth: 1, borderTopColor: P.line },
    note: { fontSize: 12, color: P.mute },
  })
);

export default PPPCalculator;
