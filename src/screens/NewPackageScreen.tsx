import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveProfile } from '@/contexts/ActiveProfileContext';
import { colors, globalStyles } from '@/styles/globalStyles';
import { courierServices } from '@/services/couriers';
import { profileStorage, type Profile } from '@/lib/storage';
import type { CourierId } from '@/types/tracking';

export function NewPackageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profileId: routeProfileId, packageId } = useLocalSearchParams<{ profileId?: string; packageId?: string }>();
  const { activeProfileId } = useActiveProfile();
  const profileId = routeProfileId ?? activeProfileId ?? undefined;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [courier, setCourier] = useState<CourierId>('blue-express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [alias, setAlias] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    profileStorage.get(profileId).then((selected) => {
      setProfile(selected);
      const saved = selected?.packages.find((item) => item.id === packageId);
      if (saved) {
        setCourier(saved.courier);
        setTrackingNumber(saved.trackingNumber);
        setAlias(saved.alias);
      }
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo cargar el perfil.'));
  }, [packageId, profileId]);
  const displayedError = error ?? (!profileId ? 'Inicia sesión y selecciona un perfil para guardar encomiendas.' : null);

  const savePackage = async () => {
    const cleanNumber = trackingNumber.trim();
    if (!profile || !cleanNumber) {
      setError('Ingresa el código de seguimiento para continuar.');
      return;
    }
    const savedPackage = profile.packages.find((item) => item.id === packageId);
    try {
      await profileStorage.savePackage(profile.id, {
        ...(savedPackage ? { id: savedPackage.id } : {}),
        courier,
        trackingNumber: cleanNumber,
        alias: alias.trim() || cleanNumber,
      });
      router.replace({ pathname: '/(tabs)/home', params: { profileId: profile.id } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la encomienda.');
    }
  };

  return (
    <View style={globalStyles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backSymbol}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{packageId ? 'Editar Encomienda' : 'Nueva Encomienda'}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>ⓘ</Text>
          <Text style={styles.noticeText}>Ingresa el número de seguimiento proporcionado por el remitente para comenzar el monitoreo en tiempo real.</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Código de Seguimiento <Text style={styles.required}>*</Text></Text>
          <TextInput
            autoCapitalize="characters"
            onChangeText={setTrackingNumber}
            placeholder="Ej. CHI-994-1294-CL"
            placeholderTextColor="#98A2B3"
            style={styles.input}
            value={trackingNumber}
          />
          <Text style={styles.hint}>Ejemplo: CHI-12345678-CL</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Courier / Empresa de Envío <Text style={styles.required}>*</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.couriers}>
            {Object.values(courierServices).map((service) => {
              const selected = courier === service.id;
              return (
                <Pressable key={service.id} onPress={() => setCourier(service.id)} style={[styles.courierOption, selected && styles.courierSelected]}>
                  <Text style={[styles.courierText, selected && styles.courierTextSelected]}>{service.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Nombre personalizado / Alias (Opcional)</Text>
          <TextInput
            onChangeText={setAlias}
            placeholder="Ej. Regalo de Cumpleaños Mamá"
            placeholderTextColor="#98A2B3"
            style={styles.input}
            value={alias}
          />
        </View>
        {displayedError && <Text style={globalStyles.error}>{displayedError}</Text>}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(8, insets.bottom + 8) }]}>
        <Pressable onPress={savePackage} style={globalStyles.button}>
          <Text style={globalStyles.buttonText}>{packageId ? 'Guardar Cambios' : 'Guardar Encomienda'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 58, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#ECEDEF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17 },
  backButton: { width: 36, height: 42, justifyContent: 'center' },
  backSymbol: { color: colors.text, fontSize: 33, lineHeight: 37 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  headerSpacer: { width: 36 },
  content: { padding: 20, gap: 20 },
  notice: { flexDirection: 'row', gap: 9, padding: 12, backgroundColor: '#EEF5FF', borderRadius: 9 },
  noticeIcon: { color: colors.primary, fontSize: 17, fontWeight: '700' },
  noticeText: { flex: 1, color: '#315DA8', fontSize: 12, lineHeight: 17 },
  field: { gap: 7 },
  label: { color: '#344054', fontSize: 12, fontWeight: '600' },
  required: { color: colors.primary },
  input: { minHeight: 45, borderWidth: 1, borderColor: colors.border, borderRadius: 9, backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: colors.text, fontSize: 14 },
  hint: { color: colors.muted, fontSize: 11 },
  couriers: { gap: 8 },
  courierOption: { borderColor: colors.border, borderWidth: 1, borderRadius: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10 },
  courierSelected: { borderColor: colors.primary, backgroundColor: '#EFF5FF' },
  courierText: { color: '#475467', fontSize: 12, fontWeight: '600' },
  courierTextSelected: { color: colors.primary },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#ECEDEF' },
});