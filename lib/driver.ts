import AsyncStorage from "@react-native-async-storage/async-storage";

const DRIVER_AVAILABILITY_KEY = "zak_driver_availability_v1";

export async function getDriverAvailability() {
  try {
    return (await AsyncStorage.getItem(DRIVER_AVAILABILITY_KEY)) === "true";
  } catch {
    return false;
  }
}

export async function setDriverAvailability(available: boolean) {
  await AsyncStorage.setItem(DRIVER_AVAILABILITY_KEY, String(available));
  return available;
}
