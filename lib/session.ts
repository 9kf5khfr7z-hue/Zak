import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export type SavedLocation = {
  latitude: number;
  longitude: number;
  label: string;
};

export type SavedSession = {
  role: "customer" | "driver";
  name: string;
  phone: string;
  location?: SavedLocation;
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
  await saveSession({ ...current, location });
}

export async function clearSavedSession() {
  await setValue(null);
}
