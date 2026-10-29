import { courierServices, getCourierService } from '@/services/couriers';
import { colors, globalStyles } from '@/styles/globalStyles';
import type { CourierId, TrackingResult } from '@/types/tracking';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function GuestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [courierId, setCourierId] = useState<CourierId>('blue-express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const service = getCourierService(courierId);

  const startTracking = async () => {
    const cleanTrackingNumber = trackingNumber.trim();
    if (!cleanTrackingNumber) {
      setError('Ingresa un número de seguimiento.');
      return;
    }
    if (!service.lookup) {
      setError('Este courier todavía está en integración.');
      return;
    }

    setResult(null);
    setError(null);
    setLoading(true);
    try {
      setResult(await service.lookup(cleanTrackingNumber));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar el pedido.');
    } finally {
      setLoading(false);
    }
  };

  const statusText = result?.status ?? 'Sin consultar aún';
  const statusTone = (() => {
    const normalized = statusText.toLowerCase();
    if (/entregad|recibid|complet|finaliz/.test(normalized)) return { background: '#E8F9F1', border: '#B2E7C8', text: '#0E7D51' };
    if (/retard|retras|cancel|proble|deterior|reten|fall|alert/.test(normalized)) return { background: '#FDECEC', border: '#F3B7B0', text: '#B42318' };
    if (/tr[aá]nsit|despach|proces|env[ií]ad|disponible|recepcion/.test(normalized)) return { background: '#EAF2FF', border: '#BED4FF', text: '#0E5BCF' };
    return { background: '#F3F6FB', border: '#D9E2EF', text: '#475569' };
  })();

  return (
    <ScrollView 
      style={globalStyles.screen} 
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: 30 + insets.bottom }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header unificado */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={18} color="#666" />
        <Text style={styles.backText}>Volver</Text>
      </Pressable>

      <View style={styles.headerSection}>
        <Text style={globalStyles.title}>Consulta como invitado</Text>
        <Text style={globalStyles.subtitle}>El resultado no se guardará en el dispositivo.</Text>
      </View>

      {/* Formulario fluido sin caja flotante */}
      <View style={styles.formSection}>
        {/* Selector de Courier compacto y horizontal para evitar listas eternas */}
        <View style={styles.field}>
          <Text style={styles.label}>Selecciona el Courier</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.couriersRow}>
            {Object.values(courierServices).map((option) => {
              const selected = courierId === option.id;
              return (
                <Pressable 
                  key={option.id} 
                  style={[styles.courierChip, selected && styles.courierChipSelected]} 
                  onPress={() => { setCourierId(option.id); setResult(null); setError(null); }}
                >
                  <Text style={[styles.courierChipText, selected && styles.courierChipTextSelected]}>
                    {option.name}{option.lookup ? '' : ' · Próximamente'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Número de seguimiento */}
        <View style={styles.field}>
          <Text style={styles.label}>Número de seguimiento</Text>
          <TextInput 
            style={globalStyles.input} 
            value={trackingNumber} 
            onChangeText={setTrackingNumber} 
            placeholder="Ej: 3716170135" 
            placeholderTextColor="#98A2B3"
            autoCapitalize="characters" 
          />
        </View>

        <Pressable 
          style={[globalStyles.button, loading && globalStyles.buttonDisabled]} 
          onPress={startTracking} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={globalStyles.buttonText}>Rastrear pedido</Text>}
        </Pressable>
      </View>

      {/* Resultados de la consulta */}
      {loading && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />}
      {error && <Text style={globalStyles.error}>{error}</Text>}

      {result && (
        <View style={styles.resultContainer}>
          <View style={globalStyles.headerCard}>
            <Text style={globalStyles.eyebrow}>Estado actual</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 6 }}>
              <View style={[globalStyles.statusPill, { backgroundColor: statusTone.background, borderColor: statusTone.border }]}>
                <Text style={[globalStyles.statusText, { color: statusTone.text }]}>{statusText}</Text>
              </View>
              <Text style={globalStyles.trackingCode}>{result.trackingNumber}</Text>
            </View>
            <Text style={[globalStyles.subtitle, { marginTop: 6, textAlign: 'left' }]}>{service.name}</Text>
            <View style={globalStyles.detailBox}>
              <Text style={globalStyles.detailText}>{result.detail || 'No se entregó información adicional del courier.'}</Text>
            </View>
          </View>

          <View style={globalStyles.jsonContainer}>
            <Text style={globalStyles.jsonTitle}>Datos técnicos</Text>
            <ScrollView horizontal style={globalStyles.jsonScroll}>
              <Text selectable style={globalStyles.jsonText}>{JSON.stringify(result.raw, null, 2)}</Text>
            </ScrollView>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    marginBottom: 12,
  },
  backText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  headerSection: {
    marginBottom: 20,
    gap: 6,
  },
  formSection: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '600',
  },
  couriersRow: {
    gap: 8,
    paddingVertical: 2,
  },
  courierChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  courierChipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF5FF',
  },
  courierChipText: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '600',
  },
  courierChipTextSelected: {
    color: colors.primary,
  },
  resultContainer: {
    marginTop: 24,
    gap: 16,
  },
});