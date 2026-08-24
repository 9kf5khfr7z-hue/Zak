import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  getAppIncidents,
  getDevServerMonitoringSnapshot,
  getIncidentHealthSummary,
  getIncidentSources,
  queryAppIncidents,
  type AppIncident,
  type IncidentDateFilter,
  type IncidentSort,
} from "@/lib/app-incidents";

function formatIncidentDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "وقت غير معروف";
  return date.toLocaleString("ar-LY", { dateStyle: "medium", timeStyle: "short" });
}

const dateFilters: { key: IncidentDateFilter; label: string }[] = [
  { key: "all", label: "كل الفترات" },
  { key: "today", label: "اليوم" },
  { key: "last7days", label: "آخر 7 أيام" },
];

export default function AdminIncidentsScreen() {
  const colors = useColors();
  const [incidents, setIncidents] = useState<AppIncident[]>([]);
  const [dateFilter, setDateFilter] = useState<IncidentDateFilter>("all");
  const [source, setSource] = useState<string>("");
  const [sort, setSort] = useState<IncidentSort>("newest");
  const [serverSummary, setServerSummary] = useState<Awaited<ReturnType<typeof getDevServerMonitoringSnapshot>>>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([getAppIncidents(), getDevServerMonitoringSnapshot()]).then(([next, server]) => {
      if (!active) return;
      setIncidents(next);
      setServerSummary(server);
    });
    return () => { active = false; };
  }, []));

  const appSummary = useMemo(() => getIncidentHealthSummary(incidents), [incidents]);

  const sources = useMemo(() => getIncidentSources(incidents), [incidents]);
  const visibleIncidents = useMemo(
    () => queryAppIncidents(incidents, { dateFilter, source, sort }),
    [dateFilter, incidents, source, sort],
  );
  const openCount = incidents.filter((incident) => !incident.resolved).length;

  return (
    <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="العودة إلى لوحة الإدارة">
          <Text style={[styles.backText, { color: colors.primary }]}>‹ العودة للوحة الإدارة</Text>
        </Pressable>
        <Text style={[styles.kicker, { color: colors.primary }]}>ZAK RELIABILITY</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>سجل أعطال التطبيق</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>تابع الأعطال الجديدة والمراجعة السابقة من مكان واحد.</Text>

        <View style={[styles.summary, { backgroundColor: openCount > 0 ? "#FFF4B8" : colors.surface, borderColor: openCount > 0 ? "#FFD21F" : colors.border }]}>
          <Text style={[styles.summaryNumber, { color: colors.foreground }]}>{openCount}</Text>
          <Text style={[styles.summaryText, { color: colors.foreground }]}>أعطال غير مراجعة في التطبيق</Text>
          {openCount > 0 ? <Text style={styles.newBadge}>جديد</Text> : null}
        </View>
        <View style={[styles.healthCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.healthTitle, { color: colors.foreground }]}>System Health</Text>
          <Text style={[styles.healthMeta, { color: colors.muted }]}>التطبيق: {appSummary.errorsToday} ظهور اليوم · المستخدمون المتأثرون: {appSummary.affectedUsers}</Text>
          <Text style={[styles.healthMeta, { color: colors.muted }]}>السيرفر والـAPI: {serverSummary ? `${serverSummary.summary.errorsToday} ظهور · ${serverSummary.summary.affectedUsers} مستخدم` : "غير متصل محلياً"}</Text>
          <View style={styles.healthRow}><Text style={[styles.healthItem, { color: "#C62828" }]}>حرج {appSummary.critical + (serverSummary?.summary.critical ?? 0)}</Text><Text style={[styles.healthItem, { color: "#C2410C" }]}>عالٍ {appSummary.high + (serverSummary?.summary.high ?? 0)}</Text><Text style={[styles.healthItem, { color: "#A16207" }]}>متوسط {appSummary.medium + (serverSummary?.summary.medium ?? 0)}</Text><Text style={[styles.healthItem, { color: "#15803D" }]}>منخفض {appSummary.low + (serverSummary?.summary.low ?? 0)}</Text></View>
        </View>

        <Text style={[styles.section, { color: colors.foreground }]}>التصفية حسب التاريخ</Text>
        <View style={styles.chips}>
          {dateFilters.map((item) => (
            <Pressable key={item.key} onPress={() => setDateFilter(item.key)} style={[styles.chip, { backgroundColor: dateFilter === item.key ? "#FFD21F" : colors.surface, borderColor: dateFilter === item.key ? "#FFD21F" : colors.border }]}>
              <Text style={[styles.chipText, { color: colors.foreground }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.section, { color: colors.foreground }]}>التصفية حسب نوع الخطأ</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
          <Pressable onPress={() => setSource("")} style={[styles.chip, { backgroundColor: source === "" ? "#FFD21F" : colors.surface, borderColor: source === "" ? "#FFD21F" : colors.border }]}>
            <Text style={[styles.chipText, { color: colors.foreground }]}>كل الشاشات</Text>
          </Pressable>
          {sources.map((item) => (
            <Pressable key={item} onPress={() => setSource(item)} style={[styles.chip, { backgroundColor: source === item ? "#FFD21F" : colors.surface, borderColor: source === item ? "#FFD21F" : colors.border }]}>
              <Text style={[styles.chipText, { color: colors.foreground }]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.section, { color: colors.foreground }]}>الفرز</Text>
        <View style={styles.chips}>
          {(["newest", "oldest"] as IncidentSort[]).map((item) => (
            <Pressable key={item} onPress={() => setSort(item)} style={[styles.chip, { backgroundColor: sort === item ? "#FFD21F" : colors.surface, borderColor: sort === item ? "#FFD21F" : colors.border }]}>
              <Text style={[styles.chipText, { color: colors.foreground }]}>{item === "newest" ? "الأحدث أولاً" : "الأقدم أولاً"}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.resultsHeader}>
          <Text style={[styles.section, { color: colors.foreground }]}>النتائج</Text>
          <Text style={[styles.resultCount, { color: colors.muted }]}>{visibleIncidents.length} عطل</Text>
        </View>
        {visibleIncidents.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد نتائج</Text><Text style={[styles.emptyText, { color: colors.muted }]}>غيّر خيارات التصفية لعرض أعطال أخرى.</Text></View>
        ) : visibleIncidents.map((incident) => (
          <Pressable key={incident.id} onPress={() => router.push(`/admin/incidents/${incident.id}`)} style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: incident.resolved ? colors.border : "#FFD21F" }, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`تفاصيل العطل ${incident.message}`}>
            <View style={styles.cardTop}><Text style={[styles.status, { color: incident.resolved ? colors.muted : "#111111", backgroundColor: incident.resolved ? colors.background : "#FFD21F" }]}>{incident.resolved ? "تمت المراجعة" : "جديد"}</Text><Text style={[styles.cardDate, { color: colors.muted }]}>{formatIncidentDate(incident.createdAt)}</Text></View>
            <Text style={[styles.cardMessage, { color: colors.foreground }]}>{incident.message}</Text>
            <Text style={[styles.cardSource, { color: colors.muted }]}>الشاشة: {incident.source}</Text>
            <Text style={[styles.detailsLink, { color: colors.primary }]}>عرض التفاصيل ›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ content: { paddingBottom: 32 }, healthCard: { borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 12 }, healthTitle: { fontSize: 15, fontWeight: "900", textAlign: "right" }, healthMeta: { fontSize: 10, textAlign: "right", marginTop: 6 }, healthRow: { flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 12 }, healthItem: { fontSize: 10, fontWeight: "900" }, backButton: { alignSelf: "flex-end", paddingVertical: 10 }, backText: { fontSize: 12, fontWeight: "900" }, kicker: { fontSize: 10, fontWeight: "900", textAlign: "right", marginTop: 8 }, title: { fontSize: 28, fontWeight: "900", textAlign: "right", marginTop: 4 }, subtitle: { fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 8 }, summary: { borderWidth: 1, borderRadius: 18, padding: 15, marginTop: 16, alignItems: "flex-end" }, summaryNumber: { fontSize: 28, fontWeight: "900" }, summaryText: { fontSize: 12, fontWeight: "800", marginTop: 2 }, newBadge: { color: "#111111", backgroundColor: "#FFD21F", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "900", marginTop: 8 }, section: { fontSize: 16, fontWeight: "900", textAlign: "right", marginTop: 20, marginBottom: 9 }, chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }, horizontalChips: { flexDirection: "row-reverse", gap: 8 }, chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }, chipText: { fontSize: 11, fontWeight: "800" }, resultsHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, resultCount: { fontSize: 11, marginTop: 20 }, empty: { borderWidth: 1, borderRadius: 16, padding: 18, alignItems: "flex-end" }, emptyTitle: { fontSize: 14, fontWeight: "900" }, emptyText: { fontSize: 11, marginTop: 5 }, card: { borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 10 }, pressed: { opacity: 0.72 }, cardTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }, status: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, fontWeight: "900" }, cardDate: { fontSize: 10 }, cardMessage: { fontSize: 13, fontWeight: "900", textAlign: "right", marginTop: 12 }, cardSource: { fontSize: 10, textAlign: "right", marginTop: 6 }, detailsLink: { fontSize: 11, fontWeight: "900", textAlign: "right", marginTop: 12 },
});
