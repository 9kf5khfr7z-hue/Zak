import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { createOrder } from "@/lib/orders";
import { trpc } from "@/lib/trpc";

export default function CheckoutScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ total?: string }>();
  const [payment, setPayment] = useState<"cash" | "card">("cash");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const syncOrder = trpc.orders.sync.useMutation();
  const total = Number(params.total ?? 0);

  const confirmOrder = async () => {
    if (submitting) return;
    setSubmitting(true);
    const order = await createOrder({ total, payment, note, address: "طرابلس، العنوان المحدد على الخريطة" });
    try {
      await syncOrder.mutateAsync({
        orderNumber: order.orderNumber,
        status: order.status,
        restaurantReceivedAt: new Date(order.timeline.restaurantReceivedAt),
        preparingAt: new Date(order.timeline.preparingAt),
        driverPickedUpAt: null,
        deliveredAt: null,
        etaMinutes: order.tracking.etaMinutes,
        driverLatitude: order.tracking.driverCoordinates.latitude,
        driverLongitude: order.tracking.driverCoordinates.longitude,
        destinationLatitude: order.tracking.destinationCoordinates.latitude,
        destinationLongitude: order.tracking.destinationCoordinates.longitude,
      });
    } catch {
      // الطلب المحلي يبقى متاحاً إذا لم يسجل المستخدم الدخول أو تعذر الاتصال بالخادم.
    }
    router.replace({ pathname: "/order/[id]", params: { id: order.id } });
  };

  return <ScreenContainer className="px-4" edges={["top", "bottom", "left", "right"]}><View style={styles.header}><Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.surface }]}><IconSymbol name="chevron.right" size={22} color={colors.foreground} /></Pressable><Text style={[styles.title, { color: colors.foreground }]}>تأكيد الطلب</Text><View style={{ width: 42 }} /></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 25 }}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>عنوان التوصيل</Text><Pressable onPress={() => router.push("/location")} style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.addressIcon}><IconSymbol name="location.fill" size={22} color="#111111" /></View><View style={styles.addressCopy}><Text style={[styles.addressTitle, { color: colors.foreground }]}>البيت</Text><Text style={[styles.addressText, { color: colors.muted }]}>طرابلس، العنوان المحدد على الخريطة</Text><Text style={[styles.change, { color: colors.primary }]}>تغيير العنوان</Text></View><IconSymbol name="chevron.left" size={18} color={colors.muted} /></Pressable><Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 22 }]}>طريقة الدفع</Text><View style={styles.paymentRow}><Pressable onPress={() => setPayment("cash")} style={[styles.payment, { backgroundColor: payment === "cash" ? "#FFF9D6" : colors.surface, borderColor: payment === "cash" ? "#FFD21F" : colors.border }]}><IconSymbol name="banknote.fill" size={23} color={payment === "cash" ? "#111111" : colors.muted} /><Text style={[styles.paymentText, { color: colors.foreground }]}>الدفع عند الاستلام</Text><View style={[styles.radio, payment === "cash" && styles.radioActive]} /></Pressable><Pressable onPress={() => setPayment("card")} style={[styles.payment, { backgroundColor: payment === "card" ? "#FFF9D6" : colors.surface, borderColor: payment === "card" ? "#FFD21F" : colors.border }]}><IconSymbol name="creditcard.fill" size={23} color={payment === "card" ? "#111111" : colors.muted} /><Text style={[styles.paymentText, { color: colors.foreground }]}>بطاقة مصرفية</Text><View style={[styles.radio, payment === "card" && styles.radioActive]} /></Pressable></View><Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 22 }]}>ملاحظات للسائق</Text><TextInput value={note} onChangeText={setNote} placeholder="مثال: اتصل بي عند الوصول" placeholderTextColor={colors.muted} style={[styles.note, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} textAlign="right" multiline /><View style={[styles.finalSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.summaryTitle, { color: colors.foreground }]}>ملخص الدفع</Text><View style={styles.line}><Text style={[styles.label, { color: colors.muted }]}>متجر مذاق المدينة</Text><Text style={[styles.value, { color: colors.foreground }]}>{Math.max(total - 4, 0).toFixed(2)} د.ل</Text></View><View style={styles.line}><Text style={[styles.label, { color: colors.muted }]}>التوصيل</Text><Text style={[styles.value, { color: colors.foreground }]}>4.00 د.ل</Text></View><View style={[styles.line, styles.totalLine, { borderTopColor: colors.border }]}><Text style={[styles.totalLabel, { color: colors.foreground }]}>المبلغ النهائي</Text><Text style={[styles.totalValue, { color: colors.primary }]}>{total.toFixed(2)} د.ل</Text></View></View><Pressable disabled={submitting} onPress={confirmOrder} style={[styles.confirm, submitting && { opacity: 0.6 }]}><Text style={styles.confirmText}>{submitting ? "جاري إرسال الطلب..." : "تأكيد وإرسال الطلب"}</Text><IconSymbol name="checkmark" size={19} color="#111111" /></Pressable></ScrollView></ScreenContainer>;
}
const styles = StyleSheet.create({ header: { height: 58, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, title: { fontSize: 18, fontWeight: "900" }, sectionTitle: { textAlign: "right", fontSize: 16, fontWeight: "900", marginBottom: 10 }, addressCard: { borderWidth: 1, borderRadius: 17, padding: 13, flexDirection: "row-reverse", alignItems: "center", gap: 10 }, addressIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: "#FFF9D6", alignItems: "center", justifyContent: "center" }, addressCopy: { flex: 1, alignItems: "flex-end" }, addressTitle: { fontSize: 14, fontWeight: "900" }, addressText: { fontSize: 11, marginTop: 4 }, change: { fontSize: 11, fontWeight: "800", marginTop: 6 }, paymentRow: { gap: 9 }, payment: { minHeight: 57, borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, flexDirection: "row-reverse", alignItems: "center", gap: 9 }, paymentText: { flex: 1, textAlign: "right", fontSize: 13, fontWeight: "800" }, radio: { width: 17, height: 17, borderRadius: 9, borderWidth: 2, borderColor: "#D9D9D9" }, radioActive: { borderColor: "#111111", backgroundColor: "#FFD21F" }, note: { minHeight: 75, borderWidth: 1, borderRadius: 15, padding: 13, fontSize: 12, textAlignVertical: "top" }, finalSummary: { borderWidth: 1, borderRadius: 17, padding: 15, marginTop: 20 }, summaryTitle: { fontSize: 15, fontWeight: "900", textAlign: "right", marginBottom: 13 }, line: { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 9 }, label: { fontSize: 12 }, value: { fontSize: 12, fontWeight: "700" }, totalLine: { borderTopWidth: 1, paddingTop: 13, marginTop: 4, marginBottom: 0 }, totalLabel: { fontSize: 15, fontWeight: "900" }, totalValue: { fontSize: 16, fontWeight: "900" }, confirm: { height: 54, borderRadius: 16, backgroundColor: "#FFD21F", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 }, confirmText: { color: "#111111", fontSize: 14, fontWeight: "900" } });
