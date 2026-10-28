import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { globalStyles } from '@/styles/globalStyles';
import { courierServices, getCourierService } from '@/services/couriers';
import type { CourierId, TrackingResult } from '@/types/tracking';

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
    <ScrollView style={globalStyles.screen} contentContainerStyle={[globalStyles.content, { paddingBottom: 20 + insets.bottom }]}>
      <Pressable onPress={() => router.back()}><Text style={globalStyles.buttonSecondaryText}>Volver</Text></Pressable>
      <Text style={globalStyles.title}>Consulta como invitado</Text>
      <Text style={globalStyles.subtitle}>El resultado no se guardará en el dispositivo.</Text>

      <View style={globalStyles.surface}>
        <Text style={globalStyles.label}>Courier</Text>
        <View style={{ gap: 8 }}>
          {Object.values(courierServices).map((option) => (
            <Pressable key={option.id} style={[globalStyles.buttonSecondary, courierId === option.id && globalStyles.button]} onPress={() => { setCourierId(option.id); setResult(null); setError(null); }}>
              <Text style={courierId === option.id ? globalStyles.buttonText : globalStyles.buttonSecondaryText}>{option.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={globalStyles.label}>Número de seguimiento</Text>
        <TextInput style={globalStyles.input} value={trackingNumber} onChangeText={setTrackingNumber} placeholder="Ej: 3716170135" autoCapitalize="characters" />
        <Pressable style={[globalStyles.button, loading && globalStyles.buttonDisabled]} onPress={startTracking} disabled={loading}>
          <Text style={globalStyles.buttonText}>{loading ? 'Consultando...' : 'Rastrear pedido'}</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator size="large" color="#0B63CE" />}
      {error && <Text style={globalStyles.error}>{error}</Text>}
      {result && (
        <View style={globalStyles.headerCard}>
          <Text style={globalStyles.eyebrow}>Estado actual</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <View style={[globalStyles.statusPill, { backgroundColor: statusTone.background, borderColor: statusTone.border }]}>
              <Text style={[globalStyles.statusText, { color: statusTone.text }]}>{statusText}</Text>
            </View>
            <Text style={globalStyles.trackingCode}>{result.trackingNumber}</Text>
          </View>
          <Text style={globalStyles.subtitle}>{service.name}</Text>
          <View style={globalStyles.detailBox}>
            <Text style={globalStyles.detailText}>{result.detail || 'No se entregó información adicional del courier.'}</Text>
          </View>
        </View>
      )}
      {result && (
        <View style={globalStyles.jsonContainer}>
          <Text style={globalStyles.jsonTitle}>Datos técnicos</Text>
          <ScrollView horizontal style={globalStyles.jsonScroll}>
            <Text selectable style={globalStyles.jsonText}>{JSON.stringify(result.raw, null, 2)}</Text>
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}