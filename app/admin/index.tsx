import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getDriverRatingStats } from "@/lib/driver-ratings";

const baseStats = [
  { label: "طلبات اليوم", value: "24", note: "+12%" },
  { label: "مندوبون متاحون", value: "8", note: "جاهزون" },
  { label: "متاجر نشطة", value: "31", note: "4 فئات" },
  { label: "شكاوى مفتوحة", value: "3", note: "تحتاج متابعة" },
];

export default function AdminDashboard() {
  const colors = useColors();
  const [ratingStats, setRatingStats] = useState({ average: 0, count: 0 });
  useFocusEffect(useCallback(() => {
    let active = true;
    getDriverRatingStats().then((next) => { if (active) setRatingStats(next); });
    return () => { active = false; };
  }, []));
  const stats = [
    ...baseStats,
    { label: "متوسط تقييم السائقين", value: ratingStats.count > 0 ? ratingStats.average.toFixed(1) : "—", note: ratingStats.count > 0 ? "من 5 نجوم" : "لا توجد تقييمات" },
    { label: "إجمالي تقييمات السائقين", value: String(ratingStats.count), note: ratingStats.count === 1 ? "تقييم واحد" : "تقييمات مكتملة" },
  ];
  return <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content}><Text style={[styles.kicker, { color: colors.primary }]}>ZAK CONTROL CENTER</Text><Text style={[styles.title, { color: colors.foreground }]}>لوحة الإدارة</Text><View style={styles.hero}><Text style={styles.heroTitle}>زاك يمشي على الخريطة</Text><Text style={styles.heroText}>راقب الطلبات، التوزيع، العهدة والدعم من واجهة واحدة.</Text><View style={styles.pill}><Text style={styles.pillText}>النظام يعمل</Text></View></View><View style={styles.grid}>{stats.map((item) => <View key={item.label} style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.value, { color: colors.foreground }]}>{item.value}</Text><Text style={[styles.label, { color: colors.muted }]}>{item.label}</Text><Text style={[styles.note, { color: item.label === "شكاوى مفتوحة" ? "#DC2626" : colors.primary }]}>{item.note}</Text></View>)}</View><Text style={[styles.section, { color: colors.foreground }]}>مراكز المتابعة</Text>{[
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
const styles = StyleSheet.create({ content: { paddingBottom: 32 }, kicker: { fontSize: 10, fontWeight: "900", textAlign: "right", marginTop: 18 }, title: { fontSize: 29, fontWeight: "900", textAlign: "right", marginTop: 3 }, hero: { backgroundColor: "#111111", borderRadius: 22, padding: 20, marginTop: 18, alignItems: "flex-end" }, heroTitle: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" }, heroText: { color: "#D1D5DB", fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 8 }, pill: { backgroundColor: "#FFD21F", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 14 }, pillText: { color: "#111111", fontSize: 10, fontWeight: "900" }, grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 9, marginTop: 14 }, stat: { width: "48%", borderWidth: 1, borderRadius: 16, padding: 13, alignItems: "flex-end" }, value: { fontSize: 24, fontWeight: "900" }, label: { fontSize: 10, marginTop: 4 }, note: { fontSize: 10, fontWeight: "900", marginTop: 7 }, section: { fontSize: 17, fontWeight: "900", textAlign: "right", marginTop: 24, marginBottom: 10 }, row: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", marginBottom: 8 }, arrow: { width: 27, height: 27, borderRadius: 9, backgroundColor: "#111111", alignItems: "center", justifyContent: "center" }, arrowText: { color: "#FFD21F", fontSize: 22, lineHeight: 22 }, rowText: { flex: 1, textAlign: "right", fontSize: 12, fontWeight: "900", marginRight: 10 }, index: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" }, indexText: { color: "#111111", fontWeight: "900" }, rowPressed: { opacity: 0.72 } });
