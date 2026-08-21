import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const stages = [
  { value: "accepted", label: "قبول الطلب" },
  { value: "preparing", label: "المطعم يجهّز الطلب" },
  { value: "picked_up", label: "استلمت الطلب" },
  { value: "on_the_way", label: "في الطريق للزبون" },
  { value: "delivered", label: "تم التسليم" },
] as const;

type Stage = (typeof stages)[number]["value"];

export default function DriverUpdateOrderScreen() {
  const colors = useColors();
  const [orderNumber, setOrderNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [rating, setRating] = useState("5.00");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<Stage>("picked_up");
  const [eta, setEta] = useState("15");
  const [feedback, setFeedback] = useState("");
  const saveProfile = trpc.driverProfile.save.useMutation();
  const syncOrder = trpc.orders.sync.useMutation();

  const submit = async () => {
    if (!orderNumber.trim() || !displayName.trim()) {
      setFeedback("اكتب رقم الطلب واسم السائق أولاً.");
      return;
    }
    setFeedback("جاري مزامنة التحديث...");
    try {
      await saveProfile.mutateAsync({
        displayName: displayName.trim(),
        photoUrl: photoUrl.trim() ? photoUrl.trim() : null,
        rating: rating.trim() || "5.00",
        phone: phone.trim() || null,
      });
      const now = new Date();
      await syncOrder.mutateAsync({
        orderNumber: orderNumber.trim(),
        status: stage,
        driverPickedUpAt: stage === "picked_up" || stage === "on_the_way" || stage === "delivered" ? now : undefined,
        deliveredAt: stage === "delivered" ? now : undefined,
        etaMinutes: Math.max(0, Number(eta) || 0),
      });
      setFeedback("تم تحديث الطلب وملف السائق على الخادم.");
    } catch {
      setFeedback("تعذر التحديث. تأكد من تسجيل الدخول بحساب سائق واتصال الخادم.");
    }
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}><IconSymbol name="chevron.right" size={22} color={colors.foreground} /></Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>تحديث الطلب والسائق</Text>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.section, { color: colors.foreground }]}>بيانات الطلب</Text>
        <TextInput value={orderNumber} onChangeText={setOrderNumber} placeholder="رقم الطلب مثل ZAK-123456" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} textAlign="right" />
        <Text style={[styles.section, { color: colors.foreground }]}>مرحلة الطلب</Text>
        <View style={styles.stageList}>{stages.map((item) => <Pressable key={item.value} onPress={() => setStage(item.value)} style={[styles.stage, { backgroundColor: stage === item.value ? "#FFF9D6" : colors.surface, borderColor: stage === item.value ? "#FFD21F" : colors.border }]}><Text style={[styles.stageText, { color: colors.foreground }]}>{item.label}</Text><View style={[styles.radio, stage === item.value && styles.radioActive]} /></Pressable>)}</View>
        <TextInput value={eta} onChangeText={setEta} keyboardType="number-pad" placeholder="الوقت التقريبي بالدقائق" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} textAlign="right" />
        <Text style={[styles.section, { color: colors.foreground }]}>ملف السائق الظاهر للزبون</Text>
        <TextInput value={displayName} onChangeText={setDisplayName} placeholder="اسم السائق" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} textAlign="right" />
        <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="رقم الهاتف" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} textAlign="right" />
        <TextInput value={photoUrl} onChangeText={setPhotoUrl} autoCapitalize="none" placeholder="رابط صورة السائق (اختياري)" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} textAlign="right" />
        <TextInput value={rating} onChangeText={setRating} keyboardType="decimal-pad" placeholder="التقييم من 0 إلى 5" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} textAlign="right" />
        {feedback ? <Text style={[styles.feedback, { color: feedback.startsWith("تم") ? "#15803D" : "#B91C1C" }]}>{feedback}</Text> : null}
        <Pressable onPress={submit} disabled={saveProfile.isPending || syncOrder.isPending} style={[styles.submit, (saveProfile.isPending || syncOrder.isPending) && { opacity: 0.6 }]}><Text style={styles.submitText}>{saveProfile.isPending || syncOrder.isPending ? "جاري الحفظ..." : "حفظ وتحديث الطلب"}</Text><IconSymbol name="checkmark" size={19} color="#111111" /></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ header: { height: 58, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, title: { fontSize: 18, fontWeight: "900" }, content: { paddingBottom: 30 }, section: { textAlign: "right", fontSize: 16, fontWeight: "900", marginTop: 17, marginBottom: 9 }, input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, fontSize: 12, marginBottom: 8 }, stageList: { gap: 8 }, stage: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, stageText: { fontSize: 12, fontWeight: "800" }, radio: { width: 17, height: 17, borderRadius: 9, borderWidth: 2, borderColor: "#CBD5E1" }, radioActive: { borderColor: "#111111", backgroundColor: "#FFD21F" }, feedback: { textAlign: "right", fontSize: 11, fontWeight: "800", marginVertical: 8 }, submit: { height: 53, borderRadius: 16, backgroundColor: "#FFD21F", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }, submitText: { color: "#111111", fontSize: 13, fontWeight: "900" } });
