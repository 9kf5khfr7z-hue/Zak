import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { updateSavedLocation } from "@/lib/session";
import { router, useLocalSearchParams } from "expo-router";
import type { Region } from "react-native-maps";
import { LocationMap } from "@/components/location-map";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const initialRegion: Region = { latitude: 32.8872, longitude: 13.1913, latitudeDelta: 0.045, longitudeDelta: 0.045 };

export default function LocationScreen() {
  const colors = useColors();
  const { tag, title } = useLocalSearchParams<{ tag?: string; title?: string }>();
  const [region, setRegion] = useState(initialRegion);
  const [confirmed, setConfirmed] = useState(false);
  const coordinates = useMemo(() => `${region.latitude.toFixed(5)}, ${region.longitude.toFixed(5)}`, [region]);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.surface }]}>
          <IconSymbol name="chevron.right" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>حدد موقعك</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>حرّك الخريطة وضع المؤشر على بابك</Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      <View style={styles.mapWrap}>
        <LocationMap initialRegion={initialRegion} region={region} onRegionChangeComplete={setRegion} />
        <View pointerEvents="none" style={styles.centerPin}>
          <View style={styles.pinHalo}><IconSymbol name="location.fill" size={30} color="#111111" /></View>
        </View>
        <View style={[styles.mapControls, { backgroundColor: colors.surface }]}>
          <Pressable><IconSymbol name="plus" size={22} color={colors.foreground} /></Pressable>
          <View style={[styles.controlDivider, { backgroundColor: colors.border }]} />
          <Pressable><IconSymbol name="minus" size={22} color={colors.foreground} /></Pressable>
        </View>
      </View>

      <View style={[styles.bottomCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardTop}>
          <View style={[styles.addressIcon, { backgroundColor: "#FFF9D6" }]}><IconSymbol name="location.fill" size={22} color="#111111" /></View>
          <View style={styles.addressCopy}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>موقع التوصيل المحدد</Text>
            <Text style={[styles.address, { color: colors.muted }]}>{confirmed ? "تم تثبيت الموقع على الخريطة" : "حرّك الخريطة للتحديد بدقة"}</Text>
          </View>
        </View>
        <View style={[styles.coords, { backgroundColor: colors.background }]}>
          <Text style={[styles.coordsText, { color: colors.muted }]}>{coordinates}</Text>
          <Text style={[styles.coordsLabel, { color: colors.muted }]}>الإحداثيات</Text>
        </View>
        <Pressable onPress={async () => { setConfirmed(true); await updateSavedLocation({ latitude: region.latitude, longitude: region.longitude, label: title || "موقع التوصيل المحدد", tag: tag === "work" || tag === "other" ? tag : "home" }); router.replace("/(tabs)"); }} style={styles.confirm}>
          <Text style={styles.confirmText}>تأكيد هذا العنوان</Text>
          <IconSymbol name="checkmark" size={18} color="#111111" />
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 10, paddingBottom: 13 },
  iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, alignItems: "flex-end", marginRight: 12 },
  title: { fontSize: 22, fontWeight: "900" },
  subtitle: { fontSize: 12, marginTop: 4 },
  mapWrap: { flex: 1, marginHorizontal: 12, borderRadius: 24, overflow: "hidden", position: "relative", minHeight: 330 },
  webMapFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  webMapTitle: { fontSize: 16, fontWeight: "800", textAlign: "center", marginTop: 14 },
  webMapText: { fontSize: 12, lineHeight: 19, textAlign: "center", marginTop: 8 },
  centerPin: { position: "absolute", left: "50%", top: "50%", marginLeft: -25, marginTop: -25 },
  pinHalo: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#FFD21F", borderWidth: 5, borderColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" },
  mapControls: { position: "absolute", left: 14, top: 14, borderRadius: 13, paddingVertical: 6, paddingHorizontal: 8, alignItems: "center" },
  controlDivider: { width: 25, height: 1, marginVertical: 4 },
  bottomCard: { borderWidth: 1, margin: 12, padding: 15, borderRadius: 21 },
  cardTop: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  addressIcon: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  addressCopy: { flex: 1, alignItems: "flex-end" },
  cardTitle: { fontSize: 14, fontWeight: "900", marginBottom: 4 },
  address: { fontSize: 12 },
  coords: { marginTop: 12, padding: 10, borderRadius: 11, flexDirection: "row-reverse", justifyContent: "space-between" },
  coordsText: { fontSize: 11, fontVariant: ["tabular-nums"] },
  coordsLabel: { fontSize: 11 },
  confirm: { height: 50, borderRadius: 14, backgroundColor: "#FFD21F", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 },
  confirmText: { color: "#111111", fontSize: 14, fontWeight: "900" },
});
