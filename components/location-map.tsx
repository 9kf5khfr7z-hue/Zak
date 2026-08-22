import { Platform, StyleSheet, Text, View } from "react-native";
import type { Region } from "react-native-maps";
import { IconSymbol } from "@/components/ui/icon-symbol";

export function LocationMap({ initialRegion, region, onRegionChangeComplete }: { initialRegion: Region; region: Region; onRegionChangeComplete: (region: Region) => void }) {
  if (Platform.OS !== "web") {
    // The native map module must stay lazy to keep the web bundle free of native map dependencies.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NativeMapView = require("./location-map.native").LocationMap;
    return <NativeMapView initialRegion={initialRegion} region={region} onRegionChangeComplete={onRegionChangeComplete} />;
  }
  return <View style={styles.container}><IconSymbol name="map.fill" size={46} color="#111111" /><Text style={styles.title}>الخريطة التفاعلية تظهر داخل تطبيق الهاتف</Text><Text style={styles.text}>في المعاينة يمكن تأكيد الموقع الافتراضي، وعلى Android وiPhone يمكنك تحريك الخريطة بدقة.</Text></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: "#F7F7F7" }, title: { fontSize: 16, fontWeight: "800", textAlign: "center", marginTop: 14, color: "#111111" }, text: { fontSize: 12, lineHeight: 19, textAlign: "center", marginTop: 8, color: "#687076" } });
