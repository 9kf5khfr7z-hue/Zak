import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getAppIncidents, type AppIncident } from "@/lib/app-incidents";

function formatIncidentDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "وقت غير معروف";
  return date.toLocaleString("ar-LY", { dateStyle: "full", timeStyle: "medium" });
}

export default function AdminIncidentDetailsScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [incident, setIncident] = useState<AppIncident | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    getAppIncidents().then((items) => {
      if (active) setIncident(items.find((item) => item.id === id) ?? null);
    });
    return () => { active = false; };
  }, [id]));

  return (
    <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="العودة إلى سجل الأعطال">
          <Text style={[styles.backText, { color: colors.primary }]}>‹ العودة للسجل</Text>
        </Pressable>
        <Text style={[styles.kicker, { color: colors.primary }]}>INCIDENT DETAILS</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>تفاصيل العطل</Text>
        {!incident ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>العطل غير موجود</Text><Text style={[styles.cardText, { color: colors.muted }]}>ربما تم حذف السجل أو تغييره.</Text></View>
        ) : (
          <>
            <View style={[styles.statusCard, { backgroundColor: incident.resolved ? colors.surface : "#FFF4B8", borderColor: incident.resolved ? colors.border : "#FFD21F" }]}>
              <Text style={[styles.status, { color: incident.resolved ? colors.muted : "#111111", backgroundColor: incident.resolved ? colors.background : "#FFD21F" }]}>{incident.resolved ? "تمت المراجعة" : "جديد"}</Text>
              <Text style={[styles.statusHint, { color: colors.muted }]}>{incident.resolved ? "تم تسجيل متابعة هذا العطل." : "هذا العطل يحتاج متابعة الإدارة."}</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.muted }]}>سبب الخطأ</Text>
              <Text selectable style={[styles.message, { color: colors.foreground }]}>{incident.message}</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.label, { color: colors.muted }]}>الشاشة أو المصدر</Text>
              <Text selectable style={[styles.value, { color: colors.foreground }]}>{incident.source}</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.label, { color: colors.muted }]}>وقت حدوث الخطأ</Text>
              <Text selectable style={[styles.value, { color: colors.foreground }]}>{formatIncidentDate(incident.createdAt)}</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.label, { color: colors.muted }]}>معرّف السجل</Text>
              <Text selectable style={[styles.id, { color: colors.muted }]}>{incident.id}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ content: { paddingBottom: 32 }, backButton: { alignSelf: "flex-end", paddingVertical: 10 }, backText: { fontSize: 12, fontWeight: "900" }, kicker: { fontSize: 10, fontWeight: "900", textAlign: "right", marginTop: 8 }, title: { fontSize: 29, fontWeight: "900", textAlign: "right", marginTop: 4 }, statusCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 18, alignItems: "flex-end" }, status: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: "900" }, statusHint: { fontSize: 11, textAlign: "right", marginTop: 9 }, card: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 12, alignItems: "flex-end" }, cardTitle: { fontSize: 15, fontWeight: "900" }, cardText: { fontSize: 11, marginTop: 6 }, label: { width: "100%", fontSize: 11, textAlign: "right", fontWeight: "800" }, message: { width: "100%", fontSize: 16, lineHeight: 24, textAlign: "right", fontWeight: "900", marginTop: 7 }, value: { width: "100%", fontSize: 13, textAlign: "right", fontWeight: "800", marginTop: 7 }, id: { width: "100%", fontSize: 10, textAlign: "right", marginTop: 7 }, divider: { width: "100%", height: 1, marginVertical: 16 },
});
