import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { clearSavedSession, getSavedSession, saveAddresses, updateProfile, type SavedAddress, type SavedSession } from "@/lib/session";

export default function ProfileScreen() {
  const colors = useColors();
  const [session, setSession] = useState<SavedSession | null>(null);
  const [editing, setEditing] = useState(false);
  const [addressesOpen, setAddressesOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    getSavedSession().then((saved) => {
      setSession(saved);
      setName(saved?.name ?? "");
      setPhone(saved?.phone ?? "");
      setAddresses(saved?.addresses ?? (saved?.location ? [{ ...saved.location, id: "default", title: "عنواني" }] : []));
    });
  }, []);

  const refresh = async () => {
    const saved = await getSavedSession();
    setSession(saved);
    setName(saved?.name ?? "");
    setPhone(saved?.phone ?? "");
    setAddresses(saved?.addresses ?? []);
  };

  const savePersonalData = async () => {
    await updateProfile(name, phone);
    await refresh();
    setEditing(false);
  };

  const persistAddresses = async (next: SavedAddress[]) => {
    setAddresses(next);
    await saveAddresses(next);
    await refresh();
  };

  const makeDefault = (id?: string) => persistAddresses(addresses.map((address) => ({ ...address, isDefault: address.id === id })));

  const removeAddress = (id?: string) => {
    const next = addresses.filter((address) => address.id !== id);
    if (next.length && !next.some((address) => address.isDefault)) next[0].isDefault = true;
    persistAddresses(next);
  };

  const addAddress = async () => {
    if (!newTitle.trim()) return;
    router.push("/location");
    setNewTitle("");
    setAddressesOpen(false);
  };

  const logout = async () => {
    await clearSavedSession();
    router.replace("/welcome");
  };

  const items = [{ icon: "bell.fill", title: "الإشعارات", text: "تنبيهات حالة الطلب" }, { icon: "shield.fill", title: "الخصوصية والأمان", text: "إعدادات الحساب والخصوصية" }, { icon: "questionmark.circle.fill", title: "المساعدة", text: "الأسئلة الشائعة والدعم" }];

  return <ScreenContainer className="px-5" containerClassName="bg-background"><View style={styles.header}><Text style={[styles.title, { color: colors.foreground }]}>حسابي</Text><Text style={[styles.subtitle, { color: colors.muted }]}>إدارة بياناتك وعناوين التوصيل بسهولة</Text></View><View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={styles.avatarText}>ز</Text></View><View style={styles.profileInfo}><Text style={[styles.nameText, { color: colors.foreground }]}>{session?.name ?? "زبون زاك"}</Text><Text style={[styles.phoneText, { color: colors.muted }]}>{session?.phone || "لم يُضف رقم الهاتف بعد"}</Text></View><Pressable onPress={() => setEditing(true)} style={styles.smallEdit}><IconSymbol name="pencil" size={18} color={colors.primary} /></Pressable></View><View style={styles.actionRow}><Pressable onPress={() => setEditing(true)} style={[styles.actionButton, { backgroundColor: colors.primary }]}><IconSymbol name="pencil" size={17} color="#111827" /><Text style={styles.actionText}>تعديل بياناتي</Text></Pressable><Pressable onPress={() => setAddressesOpen(true)} style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}><IconSymbol name="location.fill" size={17} color={colors.primary} /><Text style={[styles.actionText, { color: colors.foreground }]}>عناويني ({addresses.length})</Text></Pressable></View><Text style={[styles.section, { color: colors.foreground }]}>العنوان الافتراضي</Text><View style={[styles.defaultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.addressIcon, { backgroundColor: "#FFF7E0" }]}><IconSymbol name="location.fill" size={22} color="#D99A00" /></View><View style={styles.addressInfo}><Text style={[styles.addressTitle, { color: colors.foreground }]}>{addresses.find((a) => a.isDefault)?.title ?? "لم تحدد عنواناً بعد"}</Text><Text style={[styles.addressText, { color: colors.muted }]}>{addresses.find((a) => a.isDefault)?.label ?? "أضف عنوان التوصيل من الخريطة"}</Text></View><IconSymbol name="chevron.left" size={18} color={colors.muted} /></View><Text style={[styles.section, { color: colors.foreground }]}>الإعدادات</Text>{items.map((item) => <Pressable key={item.title} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.rowIcon, { backgroundColor: "#EEF2FF" }]}><IconSymbol name={item.icon as any} size={21} color={colors.primary} /></View><View style={styles.rowInfo}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.rowText, { color: colors.muted }]}>{item.text}</Text></View><IconSymbol name="chevron.left" size={18} color={colors.muted} /></Pressable>)}<Pressable onPress={logout} style={styles.logout}><Text style={[styles.logoutText, { color: colors.error }]}>تسجيل الخروج ومسح البيانات المحفوظة</Text></Pressable><Modal visible={editing} animationType="slide" transparent onRequestClose={() => setEditing(false)}><View style={styles.modalBackdrop}><View style={[styles.sheet, { backgroundColor: colors.background }]}><View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.foreground }]}>تعديل بياناتي</Text><Pressable onPress={() => setEditing(false)}><IconSymbol name="xmark" size={22} color={colors.foreground} /></Pressable></View><Text style={[styles.label, { color: colors.foreground }]}>الاسم الكامل</Text><TextInput value={name} onChangeText={setName} placeholder="الاسم الكامل" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} textAlign="right" /><Text style={[styles.label, { color: colors.foreground }]}>رقم الهاتف</Text><TextInput value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} keyboardType="phone-pad" textAlign="right" /><Pressable onPress={savePersonalData} style={styles.saveButton}><Text style={styles.saveText}>حفظ التعديلات</Text></Pressable></View></View></Modal><Modal visible={addressesOpen} animationType="slide" transparent onRequestClose={() => setAddressesOpen(false)}><View style={styles.modalBackdrop}><View style={[styles.sheet, { backgroundColor: colors.background }]}><View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.foreground }]}>إدارة العناوين</Text><Pressable onPress={() => setAddressesOpen(false)}><IconSymbol name="xmark" size={22} color={colors.foreground} /></Pressable></View>{addresses.map((address) => <View key={address.id} style={[styles.addressRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.addressInfo}><Text style={[styles.addressTitle, { color: colors.foreground }]}>{address.title}{address.isDefault ? " · افتراضي" : ""}</Text><Text style={[styles.addressText, { color: colors.muted }]}>{address.label}</Text></View><View style={styles.addressActions}><Pressable onPress={() => makeDefault(address.id)}><Text style={[styles.link, { color: colors.primary }]}>اختيار</Text></Pressable><Pressable onPress={() => Alert.alert("حذف العنوان؟", "سيتم حذف هذا العنوان من الجهاز.", [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: () => removeAddress(address.id) }])}><Text style={[styles.link, { color: colors.error }]}>حذف</Text></Pressable></View></View>)}<TextInput value={newTitle} onChangeText={setNewTitle} placeholder="اسم العنوان الجديد، مثل: البيت" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} textAlign="right" /><Pressable onPress={addAddress} style={styles.saveButton}><Text style={styles.saveText}>إضافة عنوان من الخريطة</Text></Pressable></View></View></Modal></ScreenContainer>;
}

const styles = StyleSheet.create({ header: { alignItems: "flex-end", paddingTop: 22, marginBottom: 22 }, title: { fontSize: 28, fontWeight: "800" }, subtitle: { fontSize: 13, marginTop: 6 }, profileCard: { borderWidth: 1, borderRadius: 20, padding: 16, flexDirection: "row-reverse", alignItems: "center", gap: 12 }, avatar: { width: 55, height: 55, borderRadius: 18, alignItems: "center", justifyContent: "center" }, avatarText: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" }, profileInfo: { flex: 1, alignItems: "flex-end" }, nameText: { fontSize: 16, fontWeight: "800", marginBottom: 4 }, phoneText: { fontSize: 12 }, smallEdit: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7E0" }, actionRow: { flexDirection: "row-reverse", gap: 9, marginTop: 13 }, actionButton: { flex: 1, minHeight: 48, borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7 }, actionText: { color: "#111827", fontSize: 12, fontWeight: "800" }, section: { textAlign: "right", fontSize: 18, fontWeight: "800", marginTop: 26, marginBottom: 11 }, defaultCard: { borderWidth: 1, borderRadius: 17, padding: 13, flexDirection: "row-reverse", alignItems: "center", gap: 10 }, addressIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" }, addressInfo: { flex: 1, alignItems: "flex-end" }, addressTitle: { fontSize: 13, fontWeight: "800", marginBottom: 4 }, addressText: { fontSize: 11 }, row: { minHeight: 68, borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: "row-reverse", alignItems: "center", gap: 11, marginBottom: 9 }, rowIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, rowInfo: { flex: 1, alignItems: "flex-end" }, rowTitle: { fontSize: 13, fontWeight: "800", marginBottom: 4 }, rowText: { fontSize: 11 }, logout: { paddingVertical: 18, alignItems: "center" }, logoutText: { fontSize: 13, fontWeight: "800" }, modalBackdrop: { flex: 1, backgroundColor: "rgba(7,17,38,0.45)", justifyContent: "flex-end" }, sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, minHeight: 390 }, sheetHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }, sheetTitle: { fontSize: 22, fontWeight: "900" }, label: { textAlign: "right", fontSize: 13, fontWeight: "800", marginBottom: 7, marginTop: 8 }, input: { height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 14 }, saveButton: { height: 52, borderRadius: 15, backgroundColor: "#FFC400", alignItems: "center", justifyContent: "center", marginTop: 18 }, saveText: { color: "#111827", fontSize: 14, fontWeight: "900" }, addressRow: { borderWidth: 1, borderRadius: 15, padding: 12, flexDirection: "row-reverse", alignItems: "center", marginBottom: 9, gap: 8 }, addressActions: { flexDirection: "row-reverse", gap: 12 }, link: { fontSize: 11, fontWeight: "900" } });
