import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, globalStyles } from '@/styles/globalStyles';
import { courierServices } from '@/services/couriers';
import { profileStorage, type SavedPackage } from '@/lib/storage';
import type { TrackingResult } from '@/types/tracking';

export function PackageDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profileId, packageId } = useLocalSearchParams<{ profileId?: string; packageId?: string }>();
  const [item, setItem] = useState<SavedPackage | null>(null);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    let isActive = true;
    const loadPackage = async () => {
      try {
        const selectedProfile = await profileStorage.get(profileId);
        const selectedPackage = selectedProfile?.packages.find((candidate) => candidate.id === packageId) ?? null;
        if (!isActive) return;
        setItem(selectedPackage);
        setResult(selectedPackage?.result ?? null);
        if (!selectedPackage || !selectedProfile) return;

        const lookup = courierServices[selectedPackage.courier].lookup;
        if (!lookup) return;
        const latestResult = await lookup(selectedPackage.trackingNumber);
        await profileStorage.saveResult(selectedProfile.id, selectedPackage.id, latestResult);
        if (isActive) {
          setResult(latestResult);
          setItem({ ...selectedPackage, result: latestResult });
        }
      } catch (cause) {
        if (isActive) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el pedido.');
      } finally {
        if (isActive) setLoading(false);
      }
    };
    void loadPackage();
    return () => {
      isActive = false;
    };
  }, [packageId, profileId]);
  const displayedError = error ?? (!profileId ? 'No se seleccionó un perfil.' : null);

  if (!item) {
    return (
      <View style={[globalStyles.screen, globalStyles.content]}>
        {loading && profileId ? <ActivityIndicator /> : <Text style={globalStyles.error}>{displayedError ?? 'Pedido no encontrado.'}</Text>}
      </View>
    );
  }

  const service = courierServices[item.courier];
  const statusText = result?.status ?? 'Sin consultar aún';
  return (
    <View style={globalStyles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={styles.headerButton}><Text style={styles.backSymbol}>‹</Text></Pressable>
        <Text style={styles.headerTitle}>Seguimiento de Envío</Text>
        <Pressable accessibilityLabel="Compartir seguimiento" onPress={() => Share.share({ message: `${item.alias}: ${item.trackingNumber} (${service.name})` })} style={styles.headerButton}><Text style={styles.shareSymbol}>⌯</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 20 + insets.bottom }]}>
        <View style={styles.summaryCard}>
          <View style={styles.codeHeader}><Text style={styles.summaryLabel}>CÓDIGO DE SEGUIMIENTO</Text><Text style={styles.copyLabel}>Guardado</Text></View>
          <Text style={styles.codeValue}>{item.trackingNumber}</Text>
          <View style={styles.separator} />
          <View style={styles.routeRow}>
            <View style={styles.routeColumn}><Text style={styles.summaryLabel}>ORIGEN</Text><Text style={styles.routeValue}>{result?.origin ?? 'Por confirmar'}</Text></View>
            <View style={styles.routeColumn}><Text style={styles.summaryLabel}>DESTINO</Text><Text style={styles.routeValue}>{result?.destination ?? 'Por confirmar'}</Text></View>
          </View>
        </View>
        <Text style={styles.historyTitle}>Historial de Estados</Text>
        <View style={styles.timelineRow}>
          <View style={styles.timelineDate}><Text style={styles.timelineDateText}>Actual</Text><Text style={styles.timelineTime}>{result?.lastUpdated ?? ''}</Text></View>
          <View style={styles.timelineTrack}><View style={styles.timelineDot} /><View style={styles.timelineLine} /></View>
          <View style={styles.timelineCopy}>
            <Text style={styles.timelineStatus}>{statusText}</Text>
            <Text style={styles.timelineDetail}>{result?.detail || 'Consulta el estado más reciente proporcionado por el courier.'}</Text>
          </View>
        </View>
        {error && <Text style={globalStyles.error}>{error}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 58, paddingHorizontal: 13, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#ECEDEF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 36, alignItems: 'center', justifyContent: 'center' },
  backSymbol: { color: colors.text, fontSize: 32, lineHeight: 36 },
  headerTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  shareSymbol: { color: colors.text, fontSize: 23 },
  content: { paddingBottom: 20, gap: 11 },
  summaryCard: { marginHorizontal: 14, marginTop: 1, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', padding: 12 },
  codeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#667085', fontSize: 10, fontWeight: '600' },
  copyLabel: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  codeValue: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 6 },
  separator: { height: 1, backgroundColor: '#ECEDEF', marginVertical: 9 },
  routeRow: { flexDirection: 'row', gap: 12 },
  routeColumn: { flex: 1, gap: 3 },
  routeValue: { color: '#344054', fontSize: 10, fontWeight: '700' },
  historyTitle: { color: '#344054', fontSize: 13, fontWeight: '800', marginHorizontal: 16, marginTop: 1 },
  timelineRow: { flexDirection: 'row', minHeight: 88, paddingHorizontal: 13 },
  timelineDate: { width: 46, alignItems: 'center', paddingTop: 3 },
  timelineDateText: { color: '#475467', fontSize: 9, fontWeight: '700' },
  timelineTime: { color: '#98A2B3', fontSize: 8, marginTop: 3 },
  timelineTrack: { width: 24, alignItems: 'center' },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 5 },
  timelineLine: { width: 1, flex: 1, backgroundColor: '#D0D5DD', marginTop: 4 },
  timelineCopy: { flex: 1, paddingTop: 1, gap: 4 },
  timelineStatus: { color: '#344054', fontSize: 11, fontWeight: '700' },
  timelineDetail: { color: colors.muted, fontSize: 10, lineHeight: 14 },
});