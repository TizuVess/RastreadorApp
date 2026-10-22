import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CourierId, TrackingResult } from '@/types/tracking';
import { getSupabaseClient } from '@/lib/supabase';

export type SavedPackage = {
  id: string;
  courier: CourierId;
  trackingNumber: string;
  alias: string;
  result?: TrackingResult;
};

export type PackageDraft = Omit<SavedPackage, 'id'> & { id?: string };

export type Profile = {
  id: string;
  name: string;
  packages: SavedPackage[];
};

type ProfileRow = {
  id: string;
  name: string;
  packages: PackageRow[] | null;
};

type PackageRow = {
  id: string;
  courier: CourierId;
  tracking_number: string;
  alias: string;
  result: TrackingResult | null;
};

type LegacyPackage = {
  id: string;
  courier: CourierId;
  trackingNumber: string;
  alias: string;
  result?: TrackingResult;
};

type LegacyProfile = {
  id: string;
  name: string;
  packages: LegacyPackage[];
};

const profilesKey = 'rastreador:profiles';

const mapPackage = (row: PackageRow): SavedPackage => ({
  id: row.id,
  courier: row.courier,
  trackingNumber: row.tracking_number,
  alias: row.alias,
  ...(row.result ? { result: row.result } : {}),
});

const mapProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  name: row.name,
  packages: (row.packages ?? []).map(mapPackage),
});

const profileSelection = 'id,name,packages(id,courier,tracking_number,alias,result)';

export const profileStorage = {
  async list(): Promise<Profile[]> {
    const { data, error } = await getSupabaseClient()
      .from('profiles')
      .select(profileSelection)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as ProfileRow[]).map(mapProfile);
  },

  async get(profileId: string): Promise<Profile | null> {
    const { data, error } = await getSupabaseClient()
      .from('profiles')
      .select(profileSelection)
      .eq('id', profileId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapProfile(data as ProfileRow) : null;
  },

  async createProfile(name: string): Promise<Profile> {
    const { data, error } = await getSupabaseClient()
      .from('profiles')
      .insert({ name })
      .select('id,name')
      .single();
    if (error) throw error;
    return { id: data.id, name: data.name, packages: [] };
  },

  async savePackage(profileId: string, item: PackageDraft): Promise<SavedPackage> {
    const supabase = getSupabaseClient();
    const values = {
      courier: item.courier,
      tracking_number: item.trackingNumber,
      alias: item.alias,
    };
    const response = item.id
      ? await supabase.from('packages').update(values).eq('id', item.id).eq('profile_id', profileId)
        .select('id,courier,tracking_number,alias,result').single()
      : await supabase.from('packages').insert({ ...values, profile_id: profileId })
        .select('id,courier,tracking_number,alias,result').single();
    if (response.error) throw response.error;
    return mapPackage(response.data as PackageRow);
  },

  async deletePackage(profileId: string, packageId: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('packages')
      .delete()
      .eq('profile_id', profileId)
      .eq('id', packageId);
    if (error) throw error;
  },

  async saveResult(profileId: string, packageId: string, result: TrackingResult): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('packages')
      .update({ result, updated_at: new Date().toISOString() })
      .eq('profile_id', profileId)
      .eq('id', packageId);
    if (error) throw error;
  },

  async readLegacyProfiles(): Promise<LegacyProfile[]> {
    const value = await AsyncStorage.getItem(profilesKey);
    return value ? JSON.parse(value) as LegacyProfile[] : [];
  },

  async importLegacyProfiles(userId: string, profiles: LegacyProfile[]): Promise<void> {
    if (!profiles.length) return;
    const supabase = getSupabaseClient();
    const importedProfiles = profiles.map((profile) => ({
      id: `legacy-${userId}-${profile.id}`,
      user_id: userId,
      name: profile.name,
    }));

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(importedProfiles, { onConflict: 'id', ignoreDuplicates: true });
    if (profileError) throw profileError;

    const importedPackages = profiles.flatMap((profile) => profile.packages.map((item) => ({
      id: `legacy-${userId}-${item.id}`,
      profile_id: `legacy-${userId}-${profile.id}`,
      courier: item.courier,
      tracking_number: item.trackingNumber,
      alias: item.alias,
      result: item.result ?? null,
    })));

    if (importedPackages.length) {
      const { error: packageError } = await supabase
        .from('packages')
        .upsert(importedPackages, { onConflict: 'id', ignoreDuplicates: true });
      if (packageError) throw packageError;
    }

    await AsyncStorage.removeItem(profilesKey);
  },
};
