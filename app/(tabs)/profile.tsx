import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { clearSavedSession, getSavedSession, type SavedSession } from "@/lib/session";

export default function ProfileScreen() {
  const colors = useColors();
  const [session, setSession] = useState<SavedSession | null>(null);
  const items = [{ icon: "location.fill", title: "عناويني", text: session?.location ? `${session.location.latitude.toFixed(4)}, ${session.location.longitude.toFixed(4)}` : "إدارة عناوين التوصيل" }, { icon: "bell.fill", title: "الإشعارات", text: "تنبيهات حالة الطلب" }, { icon: "shield.fill", title: "الخصوصية والأمان", text: "إعدادات الحساب والخصوصية" }, { icon: "questionmark.circle.fill", title: "المساعدة", text: "الأسئلة الشائعة والدعم" }];

  useEffect(() => { getSavedSession().then(setSession); }, []);

  const logout = async () => {
    await clearSavedSession();
    setSession(null);
    router.replace("/welcome");
  };

  return <ScreenContainer className="px-5" containerClassName="bg-background"><View style={styles.header}><Text style={[styles.title, { color: colors.foreground }]}>حسابي</Text><Text style={[styles.subtitle, { color: colors.muted }]}>بياناتك محفوظة على هذا الجهاز</Text></View><View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={styles.avatarText}>ز</Text></View><View style={styles.profileInfo}><Text style={[styles.name, { color: colors.foreground }]}>{session?.name ?? "زبون زاك"}</Text><Text style={[styles.phone, { color: colors.muted }]}>{session?.phone || "لم يُضف رقم الهاتف بعد"}</Text></View><IconSymbol name="chevron.left" size={20} color={colors.muted} /></View><Pressable onPress={session ? logout : () => router.push("/auth")} style={[styles.login, { backgroundColor: session ? colors.surface : colors.primary, borderColor: colors.border }]}><Text style={[styles.loginText, { color: session ? colors.error : "#FFFFFF" }]}>{session ? "تسجيل الخروج ومسح الجلسة" : "تسجيل الدخول أو إنشاء حساب"}</Text></Pressable><Text style={[styles.section, { color: colors.foreground }]}>الإعدادات</Text>{items.map((item) => <Pressable key={item.title} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.rowIcon, { backgroundColor: "#EEF2FF" }]}><IconSymbol name={item.icon as any} size={21} color={colors.primary} /></View><View style={styles.rowInfo}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.rowText, { color: colors.muted }]}>{item.text}</Text></View><IconSymbol name="chevron.left" size={18} color={colors.muted} /></Pressable>)}</ScreenContainer>;
}

const styles = StyleSheet.create({ header: { alignItems: "flex-end", paddingTop: 22, marginBottom: 22 }, title: { fontSize: 28, fontWeight: "800" }, subtitle: { fontSize: 13, marginTop: 6 }, profileCard: { borderWidth: 1, borderRadius: 20, padding: 16, flexDirection: "row-reverse", alignItems: "center", gap: 12 }, avatar: { width: 55, height: 55, borderRadius: 18, alignItems: "center", justifyContent: "center" }, avatarText: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" }, profileInfo: { flex: 1, alignItems: "flex-end" }, name: { fontSize: 16, fontWeight: "800", marginBottom: 4 }, phone: { fontSize: 12 }, login: { marginTop: 13, borderRadius: 15, paddingVertical: 15, alignItems: "center", borderWidth: 1 }, loginText: { fontSize: 14, fontWeight: "800" }, section: { textAlign: "right", fontSize: 18, fontWeight: "800", marginTop: 30, marginBottom: 13 }, row: { minHeight: 68, borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: "row-reverse", alignItems: "center", gap: 11, marginBottom: 9 }, rowIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, rowInfo: { flex: 1, alignItems: "flex-end" }, rowTitle: { fontSize: 13, fontWeight: "800", marginBottom: 4 }, rowText: { fontSize: 11 } });
