import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { Text } from "../../components/pulse/Text";
import { P, themedStyles } from "../../theme/theme";
import { ScreenHeader, ScreenSkeleton } from "../../components/pulse";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../config/FirebaseConfig';
import { getProfile, addBadgeAudit } from '../../services/firestoreService';
import { readCollection } from '../../services/offlineStore';

const BadgesScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const p = await getProfile(uid);
      setProfile(p || {});

      // fetch audit
      // Phone copy when offline
      const ms = (t) => (t?.toMillis ? t.toMillis() : new Date(t || 0).getTime() || 0);
      const logs = (await readCollection(uid, 'badgeAwards')).sort((a, b) => ms(b.timestamp) - ms(a.timestamp));
      setAudit(logs);
    } catch (e) {
      console.error('BadgesScreen fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  const renderBadgeTile = (t, count) => {
    const img = t === 365 ? require('../../../assets/1year.png') :
      t === 200 ? require('../../../assets/200days.png') :
      t === 100 ? require('../../../assets/100days.png') :
      t === 50 ? require('../../../assets/50days.png') :
      require('../../../assets/10days.png');
    return (
      <View style={styles.tile} key={t}>
        <Image source={img} style={styles.img} />
        <Text style={styles.tileLabel}>{t} days</Text>
        <Text style={styles.tileCount}>x{count}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenSkeleton safe header rows={4} />
    );
  }

  const badges = profile?.badges || {};
  const order = [10,50,100,200,365];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader overline="Rewards" title="Badges" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {order.map(t => renderBadgeTile(t, badges[String(t)] || 0))}
        </View>

        <Text style={styles.sectionTitle}>Award History</Text>
        {audit.length === 0 ? (
          <Text style={styles.empty}>No awards yet</Text>
        ) : audit.map(a => (
          <View key={a.id} style={styles.logRow}>
            <Text style={styles.logText}>{a.threshold} days</Text>
            <Text style={styles.logText}>x{a.count}</Text>
            <Text style={styles.logTime}>{a.timestamp?.toDate ? a.timestamp.toDate().toLocaleString() : ''}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = themedStyles(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: P.surf, borderBottomWidth: 1, borderBottomColor: P.line },
  title: { fontSize: 18, fontWeight: '700', color: P.ink },
  content: { padding: 16 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  tile: { width: '30%', alignItems: 'center', backgroundColor: P.surf, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: P.line },
  img: { width: 64, height: 64, resizeMode: 'contain' },
  tileLabel: { marginTop: 8, color: P.mute, fontWeight: '700' },
  tileCount: { marginTop: 4, color: P.ink, fontWeight: '800' },
  sectionTitle: { marginTop: 18, fontSize: 16, fontWeight: '700', color: P.ink },
  empty: { marginTop: 8, color: P.mute },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: P.line },
  logText: { color: P.ink, fontWeight: '700' },
  logTime: { color: P.mute },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
}));

export default BadgesScreen;
