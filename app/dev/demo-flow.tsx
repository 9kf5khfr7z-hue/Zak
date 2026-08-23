import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { createDemoOrder, getDemoOrders, resetDemoOrders, startDemoDispatch, transitionDemoOrder, type DemoOrder } from "@/lib/demo-orders";
import { orderStatusLabels, type OrderStatus } from "@/shared/order-state";
import { chargeMockPayment, sendMockWhatsApp } from "@/lib/providers/mock";
import { addMockLedgerEntry, getMockWallet, resetMockWallet } from "@/lib/providers/mock/wallet-mock";

const driverSteps: { status: OrderStatus; label: string }[] = [
  { status: "DRIVER_ACCEPTED", label: "قبول الطلب" },
  { status: "DRIVER_ARRIVED", label: "وصلت للمطعم" },
  { status: "PICKED_UP", label: "استلمت الطلب" },
  { status: "IN_DELIVERY", label: "بدأت التوصيل" },
  { status: "DELIVERED", label: "تم التسليم" },
];

export default function DemoFlowScreen() {
  const colors = useColors();
  const [role, setRole] = useState<"customer" | "driver">("customer");
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [feedback, setFeedback] = useState("");
  const createInFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    const all = await getDemoOrders();
    setOrders(all);
    setOrder((current) => current ? all.find((item) => item.id === current.id) ?? null : all[0] ?? null);
    setWalletBalance((await getMockWallet()).balance);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const createOrder = async () => {
    if (createInFlightRef.current) {
      return;
    }

    createInFlightRef.current = true;
    try {
      const created = await createDemoOrder();
      const dispatched = await startDemoDispatch(created.id);
      await chargeMockPayment(dispatched.total, dispatched.orderNumber);
      await addMockLedgerEntry("ORDER_PAYMENT", dispatched.total, dispatched.orderNumber);
      await sendMockWhatsApp("+218000000000", `طلب تجريبي ${dispatched.orderNumber}`);
      setOrder(dispatched);
      setRole("customer");
      setFeedback(`تم إنشاء ${dispatched.orderNumber} وإسناده للسائق التجريبي.`);
      await refresh();
    } finally {
      createInFlightRef.current = false;
    }
  };

  const advance = async (status: OrderStatus) => {
    if (!order) return;
    try {
      const updated = await transitionDemoOrder(order.id, status, status === "DELIVERED" ? "driver" : "driver");
      setOrder(updated);
      setFeedback(`تم تحديث ${updated.orderNumber} إلى ${orderStatusLabels.ar[updated.status]}.`);
      await refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "تعذر تحديث الطلب");
    }
  };

  const reset = async () => {
    await resetDemoOrders();
    await resetMockWallet();
    setOrder(null);
    setOrders([]);
    setFeedback("تمت إعادة ضبط بيانات التجربة المحلية.");
    await refresh();
  };

  const activeDriverOrder = orders.find((item) => item.driverId && ["DRIVER_ASSIGNED", "DRIVER_ACCEPTED", "DRIVER_ARRIVED", "PICKED_UP", "IN_DELIVERY"].includes(item.status));
  const current = order ?? activeDriverOrder;

  return (
    <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}><Text style={{ color: colors.foreground, fontSize: 22 }}>‹</Text></Pressable>
        <View style={styles.headerCopy}><Text style={[styles.kicker, { color: colors.muted }]}>ZAK Development-Only</Text><Text style={[styles.title, { color: colors.foreground }]}>مختبر دورة الطلب</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.notice, { backgroundColor: "#FFF9D6", borderColor: "#FFD21F" }]}><Text style={styles.noticeTitle}>محاكاة محلية فقط</Text><Text style={styles.noticeText}>لا يوجد دفع حقيقي ولا رسائل حقيقية ولا تعديل على قاعدة البيانات.</Text></View>
        <View style={styles.roleRow}><Pressable onPress={() => setRole("driver")} style={[styles.role, { backgroundColor: role === "driver" ? "#111111" : colors.surface, borderColor: colors.border }]}><Text style={{ color: role === "driver" ? "#FFFFFF" : colors.foreground, fontWeight: "900" }}>وضع المندوب</Text></Pressable><Pressable onPress={() => setRole("customer")} style={[styles.role, { backgroundColor: role === "customer" ? "#FFD21F" : colors.surface, borderColor: colors.border }]}><Text style={{ color: "#111111", fontWeight: "900" }}>وضع العميل</Text></Pressable></View>
        {role === "customer" ? <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>أنشئ طلباً تجريبياً</Text><Text style={[styles.cardText, { color: colors.muted }]}>سيتم إنشاء الطلب ثم تشغيل البحث عن مندوب وإسناده تلقائياً للسائق التجريبي.</Text><Pressable onPress={createOrder} style={styles.primary}><Text style={styles.primaryText}>إنشاء طلب Demo</Text></Pressable></View> : <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>تحكم المندوب</Text>{current ? <>{driverSteps.map((step) => { const enabled = current.status === step.status || driverSteps.findIndex((item) => item.status === current.status) + 1 === driverSteps.findIndex((item) => item.status === step.status); const done = current.history.some((item) => item.status === step.status); return <Pressable key={step.status} disabled={!enabled || done} onPress={() => void advance(step.status)} style={[styles.step, { backgroundColor: done ? "#DCFCE7" : enabled ? "#FFF9D6" : colors.background, borderColor: done ? "#86EFAC" : enabled ? "#FFD21F" : colors.border }]}><Text style={[styles.stepText, { color: colors.foreground }]}>{step.label}</Text><Text style={[styles.stepStatus, { color: done ? "#15803D" : colors.muted }]}>{done ? "تم" : enabled ? "تنفيذ" : "مقفل"}</Text></Pressable>; })}</> : <Text style={[styles.cardText, { color: colors.muted }]}>أنشئ طلباً من وضع العميل أولاً.</Text>}</View>}
        {current ? <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.orderTop}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{current.orderNumber}</Text><Text style={styles.statusPill}>{orderStatusLabels.ar[current.status]}</Text></View><Text style={[styles.cardText, { color: colors.muted }]}>{current.storeName} · {current.address}</Text><Text style={[styles.cardText, { color: colors.muted }]}>سجل الحالات: {current.history.length} · المحفظة التجريبية: {walletBalance.toFixed(2)} د.ل</Text><View style={styles.history}>{current.history.map((item) => <View key={`${item.status}-${item.at}`} style={styles.historyRow}><Text style={[styles.cardText, { color: colors.muted }]}>{new Date(item.at).toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" })}</Text><Text style={[styles.historyStatus, { color: colors.foreground }]}>{orderStatusLabels.ar[item.status]}</Text></View>)}</View></View> : null}
        {feedback ? <Text style={[styles.feedback, { color: feedback.includes("تعذر") || feedback.includes("Illegal") ? "#B91C1C" : "#15803D" }]}>{feedback}</Text> : null}
        <View style={styles.footerActions}><Pressable onPress={() => void refresh()} style={[styles.secondary, { borderColor: colors.border }]}><Text style={{ color: colors.foreground, fontWeight: "900" }}>تحديث</Text></Pressable><Pressable onPress={() => void reset()} style={[styles.secondary, { borderColor: colors.border }]}><Text style={{ color: "#B91C1C", fontWeight: "900" }}>مسح Demo</Text></Pressable></View>
        <View style={[styles.provider, { backgroundColor: colors.background, borderColor: colors.border }]}><Text style={[styles.providerTitle, { color: colors.foreground }]}>Mock Providers: OTP 123456 · Payment · Bank · SMS · WhatsApp</Text><Text style={[styles.providerText, { color: colors.muted }]}>كل النتائج محلية ولا تغادر الجهاز.</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ header: { height: 62, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, headerCopy: { alignItems: "flex-end" }, back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, kicker: { fontSize: 11 }, title: { fontSize: 22, fontWeight: "900", marginTop: 2 }, content: { paddingBottom: 35, gap: 12 }, notice: { borderWidth: 1, borderRadius: 16, padding: 13, gap: 4 }, noticeTitle: { color: "#111111", fontSize: 14, fontWeight: "900", textAlign: "right" }, noticeText: { color: "#5B4A00", fontSize: 11, textAlign: "right", lineHeight: 18 }, roleRow: { flexDirection: "row-reverse", gap: 8 }, role: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, card: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 10 }, cardTitle: { fontSize: 16, fontWeight: "900", textAlign: "right" }, cardText: { fontSize: 12, textAlign: "right", lineHeight: 19 }, primary: { backgroundColor: "#FFD21F", minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 }, primaryText: { color: "#111111", fontWeight: "900", fontSize: 13 }, step: { borderWidth: 1, borderRadius: 13, minHeight: 47, paddingHorizontal: 12, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, stepText: { fontSize: 12, fontWeight: "800" }, stepStatus: { fontSize: 11, fontWeight: "900" }, orderTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, statusPill: { backgroundColor: "#FFD21F", color: "#111111", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, fontSize: 11, fontWeight: "900" }, history: { borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 8, gap: 7 }, historyRow: { flexDirection: "row-reverse", justifyContent: "space-between" }, historyStatus: { fontSize: 12, fontWeight: "800" }, feedback: { fontSize: 12, fontWeight: "900", textAlign: "right", lineHeight: 19 }, footerActions: { flexDirection: "row-reverse", gap: 8 }, secondary: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" }, provider: { borderWidth: 1, borderRadius: 15, padding: 12, gap: 4 }, providerTitle: { fontSize: 11, fontWeight: "900", textAlign: "right" }, providerText: { fontSize: 10, textAlign: "right" } });
