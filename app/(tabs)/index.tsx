import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const categories = [
  { id: "restaurants", title: "مطاعم", icon: "restaurant", color: "#FFF1E8" },
  { id: "grocery", title: "مواد غذائية", icon: "shopping-basket", color: "#E8F7EE" },
  { id: "pharmacy", title: "صيدليات", icon: "local-pharmacy", color: "#E8F0FF" },
  { id: "phones", title: "محلات هواتف", icon: "smartphone", color: "#F3EAFE" },
] as const;

const stores = [
  { id: "1", name: "مذاق المدينة", category: "restaurants", subtitle: "وجبات بيتية ومشاوي", distance: "1.8 كم", time: "25-35 د", rating: "4.8", icon: "restaurant" },
  { id: "2", name: "سوق الخير", category: "grocery", subtitle: "كل احتياجات البيت", distance: "2.4 كم", time: "30-40 د", rating: "4.6", icon: "shopping-basket" },
  { id: "3", name: "صيدلية الشفاء", category: "pharmacy", subtitle: "أدوية ومنتجات عناية", distance: "3.1 كم", time: "20-30 د", rating: "4.9", icon: "local-pharmacy" },
  { id: "4", name: "فون زون", category: "phones", subtitle: "إكسسوارات وشحن", distance: "4.6 كم", time: "35-45 د", rating: "4.5", icon: "smartphone" },
];

const iconMap: Record<string, any> = { restaurant: "restaurant", "shopping-basket": "shopping-basket", "local-pharmacy": "local-pharmacy", smartphone: "smartphone" };

export default function HomeScreen() {
  const colors = useColors();
  const [selected, setSelected] = useState("all");
  const [query, setQuery] = useState("");
  const filteredStores = useMemo(() => stores.filter((store) => (selected === "all" || store.category === selected) && `${store.name} ${store.subtitle}`.includes(query)), [selected, query]);

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.muted }]}>التوصيل إلى</Text>
            <Pressable style={styles.locationRow}>
              <IconSymbol name="location.fill" size={20} color={colors.primary} />
              <Text style={[styles.location, { color: colors.foreground }]}>الحي الرئيسي، العنوان الحالي</Text>
              <IconSymbol name="chevron.down" size={16} color={colors.muted} />
            </Pressable>
          </View>
          <Pressable style={[styles.notification, { backgroundColor: colors.surface }]}>
            <IconSymbol name="bell.fill" size={21} color={colors.foreground} />
            <View style={styles.dot} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>كل شيء قريب منك</Text>
            <Text style={styles.heroSubtitle}>نوصل طلبك بسرعة وأمان حتى بابك</Text>
            <View style={styles.heroBadge}><IconSymbol name="checkmark.seal.fill" size={15} color="#FFFFFF" /><Text style={styles.heroBadgeText}>حد التوصيل 10 كم</Text></View>
          </View>
          <View style={styles.heroIcon}><IconSymbol name="bicycle" size={54} color="#FFFFFF" /></View>
        </View>

        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={21} color={colors.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="ابحث عن متجر أو منتج" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} />
        </View>

        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>تسوق حسب الخدمة</Text><Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          <Pressable onPress={() => setSelected("all")} style={[styles.category, { backgroundColor: selected === "all" ? colors.primary : colors.surface }]}><View style={[styles.categoryIcon, { backgroundColor: selected === "all" ? "rgba(255,255,255,0.18)" : "#EEF2FF" }]}><IconSymbol name="app.fill" size={24} color={selected === "all" ? "#FFFFFF" : colors.primary} /></View><Text style={[styles.categoryTitle, { color: selected === "all" ? "#FFFFFF" : colors.foreground }]}>الكل</Text></Pressable>
          {categories.map((category) => <Pressable key={category.id} onPress={() => setSelected(category.id)} style={[styles.category, { backgroundColor: selected === category.id ? colors.primary : colors.surface }]}><View style={[styles.categoryIcon, { backgroundColor: selected === category.id ? "rgba(255,255,255,0.18)" : category.color }]}><IconSymbol name={iconMap[category.icon]} size={24} color={selected === category.id ? "#FFFFFF" : colors.foreground} /></View><Text style={[styles.categoryTitle, { color: selected === category.id ? "#FFFFFF" : colors.foreground }]}>{category.title}</Text></Pressable>)}
        </ScrollView>

        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>متاجر قريبة منك</Text><Text style={[styles.seeAll, { color: colors.primary }]}>{filteredStores.length} متاجر</Text></View>
        <FlatList data={filteredStores} scrollEnabled={false} keyExtractor={(item) => item.id} renderItem={({ item }) => <Pressable style={({ pressed }) => [styles.storeCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.72 }]}><View style={styles.storeLogo}><IconSymbol name={iconMap[item.icon]} size={27} color={colors.primary} /></View><View style={styles.storeInfo}><Text style={[styles.storeName, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.storeSubtitle, { color: colors.muted }]}>{item.subtitle}</Text><View style={styles.metaRow}><Text style={[styles.meta, { color: colors.muted }]}>{item.distance}</Text><Text style={[styles.metaDot, { color: colors.border }]}>•</Text><Text style={[styles.meta, { color: colors.muted }]}>{item.time}</Text><Text style={[styles.rating, { color: "#D97706" }]}>★ {item.rating}</Text></View></View><IconSymbol name="chevron.right" size={20} color={colors.muted} /></Pressable>} ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>لا توجد متاجر ضمن نطاق 10 كم حالياً.</Text>} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ scrollContent: { paddingTop: 12, paddingBottom: 30 }, header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }, eyebrow: { fontSize: 12, textAlign: "right", marginBottom: 5 }, locationRow: { flexDirection: "row-reverse", alignItems: "center", gap: 5 }, location: { fontSize: 14, fontWeight: "700", textAlign: "right" }, notification: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", position: "relative" }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#F97316", position: "absolute", top: 9, right: 10, borderWidth: 1.5, borderColor: "#FFFFFF" }, hero: { borderRadius: 24, padding: 20, backgroundColor: "#4F46E5", minHeight: 146, flexDirection: "row-reverse", alignItems: "center", overflow: "hidden", marginBottom: 18 }, heroText: { flex: 1, alignItems: "flex-end" }, heroTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginBottom: 6 }, heroSubtitle: { color: "#E0E7FF", fontSize: 13, marginBottom: 13 }, heroBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.16)", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 }, heroBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" }, heroIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginLeft: 8 }, search: { height: 52, borderRadius: 16, borderWidth: 1, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 15, gap: 10, marginBottom: 24 }, searchInput: { flex: 1, textAlign: "right", fontSize: 14 }, sectionHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 13, marginTop: 2 }, sectionTitle: { fontSize: 18, fontWeight: "800" }, seeAll: { fontSize: 12, fontWeight: "700" }, categoryRow: { flexDirection: "row-reverse", gap: 10, paddingBottom: 25 }, category: { width: 88, height: 105, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 9 }, categoryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, categoryTitle: { fontSize: 12, fontWeight: "700", textAlign: "center" }, storeCard: { borderRadius: 18, borderWidth: 1, padding: 13, marginBottom: 10, flexDirection: "row-reverse", alignItems: "center", gap: 12 }, storeLogo: { width: 54, height: 54, borderRadius: 17, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }, storeInfo: { flex: 1, alignItems: "flex-end" }, storeName: { fontSize: 15, fontWeight: "800", marginBottom: 3 }, storeSubtitle: { fontSize: 12, marginBottom: 8 }, metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 }, meta: { fontSize: 11 }, metaDot: { fontSize: 12 }, rating: { fontSize: 11, fontWeight: "700", marginRight: 5 }, empty: { textAlign: "right", paddingVertical: 20, fontSize: 13 } });
