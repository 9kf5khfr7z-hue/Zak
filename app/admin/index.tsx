import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getDriverRatingStats } from "@/lib/driver-ratings";
import { getAppIncidents, resolveAllAppIncidents, type AppIncident } from "@/lib/app-incidents";

function formatIncidentDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "وقت غير معروف";
  return date.toLocaleString("ar-LY", { dateStyle: "medium", timeStyle: "short" });
}

const baseStats = [
  { label: "طلبات اليوم", value: "24", note: "+12%" },
  { label: "مندوبون متاحون", value: "8", note: "جاهزون" },
  { label: "متاجر نشطة", value: "31", note: "4 فئات" },
  { label: "شكاوى مفتوحة", value: "3", note: "تحتاج متابعة" },
];

export default function AdminDashboard() {
  const colors = useColors();
  const [ratingStats, setRatingStats] = useState({ average: 0, count: 0 });
  const [incidents, setIncidents] = useState<AppIncident[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    getDriverRatingStats().then((next) => { if (active) setRatingStats(next); });
    return () => { active = false; };
  }, []));
  useFocusEffect(useCallback(() => {
    let active = true;
    getAppIncidents().then((next) => { if (active) setIncidents(next); });
    return () => { active = false; };
  }, []));
  const openIncidents = incidents.filter((incident) => !incident.resolved);
  const markIncidentsReviewed = async () => {
    await resolveAllAppIncidents();
    setIncidents((current) => current.map((incident) => ({ ...incident, resolved: true })));
  };
  const stats = [
    ...baseStats,
    { label: "متوسط تقييم السائقين", value: ratingStats.count > 0 ? ratingStats.average.toFixed(1) : "—", note: ratingStats.count > 0 ? "من 5 نجوم" : "لا توجد تقييمات" },
    { label: "إجمالي تقييمات السائقين", value: String(ratingStats.count), note: ratingStats.count === 1 ? "تقييم واحد" : "تقييمات مكتملة" },
  ];
  return <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content}><Text style={[styles.kicker, { color: colors.primary }]}>ZAK CONTROL CENTER</Text><Text style={[styles.title, { color: colors.foreground }]}>لوحة الإدارة</Text><View style={styles.hero}><Text style={styles.heroTitle}>زاك يمشي على الخريطة</Text><Text style={styles.heroText}>راقب الطلبات، التوزيع، العهدة والدعم من واجهة واحدة.</Text><View style={styles.pill}><Text style={styles.pillText}>النظام يعمل</Text></View></View><View style={[styles.incidentCard, { backgroundColor: openIncidents.length > 0 ? "#FFF4B8" : colors.surface, borderColor: openIncidents.length > 0 ? "#FFD21F" : colors.border }]}><View style={styles.incidentHeader}><Text style={[styles.incidentCount, { color: openIncidents.length > 0 ? "#111111" : colors.muted }]}>{openIncidents.length}</Text><View style={styles.incidentCopy}><View style={styles.titleLine}><Text style={[styles.incidentTitle, { color: colors.foreground }]}>تنبيهات الأعطال</Text>{openIncidents.length > 0 ? <Text style={styles.newBadge}>جديد</Text> : null}</View><Text style={[styles.incidentText, { color: colors.muted }]}>{openIncidents.length > 0 ? "يوجد خلل يحتاج مراجعة الإدارة" : "لا توجد أعطال مفتوحة حالياً"}</Text></View></View>{openIncidents.slice(0, 3).map((incident) => <View key={incident.id} style={[styles.incidentDetail, { borderTopColor: colors.border }]}><Text style={[styles.detailValue, { color: colors.foreground }]}>{incident.message}</Text><Text style={[styles.detailMeta, { color: colors.muted }]}>الشاشة: {incident.source} · {formatIncidentDate(incident.createdAt)}</Text></View>)}{openIncidents.length > 0 ? <Pressable onPress={markIncidentsReviewed} style={styles.reviewButton}><Text style={styles.reviewButtonText}>تمت المراجعة</Text></Pressable> : null}</View><View style={styles.grid}>{stats.map((item) => <View key={item.label} style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.value, { color: colors.foreground }]}>{item.value}</Text><Text style={[styles.label, { color: colors.muted }]}>{item.label}</Text><Text style={[styles.note, { color: item.label === "شكاوى مفتوحة" ? "#DC2626" : colors.primary }]}>{item.note}</Text></View>)}</View><Text style={[styles.section, { color: colors.foreground }]}>مراكز المتابعة</Text>{[
          { label: "الطلبات المباشرة" },
          { label: "خريطة المندوبين" },
          { label: "العمولات ورسوم التوصيل", route: "/admin/finance" as const },
          { label: "طلبات رفض الزبون", route: "/admin/finance" as const, highlighted: true },
          { label: "الدعم والشكاوى" },
          { label: "المستخدمون والمتاجر" },
        ].map((item, index) => {
          const content = <><View style={styles.arrow}><Text style={styles.arrowText}>‹</Text></View><Text style={[styles.rowText, { color: colors.foreground }]}>{item.label}</Text><View style={[styles.index, { backgroundColor: item.highlighted ? "#FFD21F" : "#FFF4B8" }]}><Text style={styles.indexText}>{index + 1}</Text></View></>;
          return item.route ? <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={`فتح ${item.label}`} onPress={() => router.push(item.route)} style={({ pressed }) => [styles.row, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.rowPressed]}>{content}</Pressable> : <View key={item.label} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>{content}</View>;
        })}</ScrollView></ScreenContainer>;
}
const styles = StyleSheet.create({ content: { paddingBottom: 32 }, kicker: { fontSize: 10, fontWeight: "900", textAlign: "right", marginTop: 18 }, title: { fontSize: 29, fontWeight: "900", textAlign: "right", marginTop: 3 }, hero: { backgroundColor: "#111111", borderRadius: 22, padding: 20, marginTop: 18, alignItems: "flex-end" }, heroTitle: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" }, heroText: { color: "#D1D5DB", fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 8 }, pill: { backgroundColor: "#FFD21F", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 14 }, pillText: { color: "#111111", fontSize: 10, fontWeight: "900" }, grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 9, marginTop: 14 }, stat: { width: "48%", borderWidth: 1, borderRadius: 16, padding: 13, alignItems: "flex-end" }, value: { fontSize: 24, fontWeight: "900" }, label: { fontSize: 10, marginTop: 4 }, note: { fontSize: 10, fontWeight: "900", marginTop: 7 }, section: { fontSize: 17, fontWeight: "900", textAlign: "right", marginTop: 24, marginBottom: 10 }, row: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", marginBottom: 8 }, arrow: { width: 27, height: 27, borderRadius: 9, backgroundColor: "#111111", alignItems: "center", justifyContent: "center" }, arrowText: { color: "#FFD21F", fontSize: 22, lineHeight: 22 }, rowText: { flex: 1, textAlign: "right", fontSize: 12, fontWeight: "900", marginRight: 10 }, index: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" }, indexText: { color: "#111111", fontWeight: "900" }, rowPressed: { opacity: 0.72 }, incidentCard: { borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 14 }, incidentHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 10 }, titleLine: { flexDirection: "row-reverse", alignItems: "center", gap: 8 }, newBadge: { color: "#111111", backgroundColor: "#FFD21F", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, fontSize: 9, fontWeight: "900" }, incidentDetail: { borderTopWidth: 1, marginTop: 12, paddingTop: 10, alignItems: "flex-end" }, detailValue: { width: "100%", fontSize: 12, fontWeight: "800", textAlign: "right" }, detailMeta: { width: "100%", fontSize: 10, marginTop: 5, textAlign: "right" }, incidentCount: { minWidth: 42, height: 42, borderRadius: 14, backgroundColor: "#FFFFFF", textAlign: "center", textAlignVertical: "center", fontSize: 19, fontWeight: "900", paddingTop: 8 }, incidentCopy: { flex: 1, alignItems: "flex-end" }, incidentTitle: { fontSize: 14, fontWeight: "900" }, incidentText: { fontSize: 11, marginTop: 4, textAlign: "right" }, reviewButton: { alignSelf: "flex-end", backgroundColor: "#111111", borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8, marginTop: 11 }, reviewButtonText: { color: "#FFD21F", fontSize: 11, fontWeight: "900" } });
