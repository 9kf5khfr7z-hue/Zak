import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export type SavedLocation = {
  id?: string;
  latitude: number;
  longitude: number;
  label: string;
  isDefault?: boolean;
};

export type SavedAddress = SavedLocation & {
  title: string;
};

export type SavedSession = {
  role: "customer" | "driver";
  name: string;
  phone: string;
  location?: SavedLocation;
  addresses?: SavedAddress[];
  signedInAt: string;
};

const SESSION_KEY = "zak_customer_session";

async function setValue(value: string | null) {
  if (Platform.OS === "web") {
    if (value === null) window.localStorage.removeItem(SESSION_KEY);
    else window.localStorage.setItem(SESSION_KEY, value);
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(SESSION_KEY);
  else await SecureStore.setItemAsync(SESSION_KEY, value);
}

async function getValue() {
  if (Platform.OS === "web") return window.localStorage.getItem(SESSION_KEY);
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function getSavedSession(): Promise<SavedSession | null> {
  try {
    const raw = await getValue();
    if (!raw) return null;
    return JSON.parse(raw) as SavedSession;
  } catch {
    return null;
  }
}

export async function saveSession(session: SavedSession) {
  await setValue(JSON.stringify(session));
}

export async function updateSavedLocation(location: SavedLocation) {
  const current = await getSavedSession();
  if (!current) return;
  const nextLocation = { ...location, id: location.id ?? "default", isDefault: true };
  const addresses = current.addresses?.length ? current.addresses.map((address) => address.id === nextLocation.id ? { ...address, ...nextLocation } : { ...address, isDefault: false }) : [{ ...nextLocation, title: nextLocation.label }];
  await saveSession({ ...current, location: nextLocation, addresses });
}

export async function saveAddresses(addresses: SavedAddress[]) {
  const current = await getSavedSession();
  if (!current) return;
  const normalized = addresses.map((address, index) => ({ ...address, id: address.id ?? `address-${index + 1}`, isDefault: Boolean(address.isDefault) }));
  const selected = normalized.find((address) => address.isDefault) ?? normalized[0];
  await saveSession({ ...current, addresses: normalized.map((address) => ({ ...address, isDefault: address.id === selected?.id })), location: selected });
}

export async function updateProfile(name: string, phone: string) {
  const current = await getSavedSession();
  if (!current) return;
  await saveSession({ ...current, name: name.trim(), phone: phone.trim() });
}

export async function clearSavedSession() {
  await setValue(null);
}
