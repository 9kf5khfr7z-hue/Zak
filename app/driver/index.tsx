import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { getDriverAvailability } from "@/lib/driver";
import {
  acceptDriverOrder,
  getDriverActiveOrderId,
  getNearbyDriverOrders,
  rejectDriverOrder,
  type Order,
} from "@/lib/orders";
import { useColors } from "@/hooks/use-colors";

const DRIVER_ID = "driver-local";

export default function DriverHomeScreen() {
  const colors = useColors();
  const [available, setAvailable] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [feedback, setFeedback] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [isAvailable, activeId] = await Promise.all([getDriverAvailability(), getDriverActiveOrderId()]);
    setAvailable(isAvailable);
    setActiveOrderId(activeId);
    setOrders(isAvailable ? await getNearbyDriverOrders(DRIVER_ID, activeId) : []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const respond = async (order: Order, action: "accept" | "reject") => {
    if (action === "accept") {
      const accepted = await acceptDriverOrder(order.id, DRIVER_ID);
      if (!accepted) {
        setFeedback("لا يمكن قبول الطلب. لديك رحلة نشطة أو تم إسناده لمندوب آخر.");
        return;
      }
      setFeedback(`تم قبول ${order.orderNumber}. لا يمكن إضافة طلب مطعم آخر لهذه الرحلة.`);
      setActiveOrderId(order.id);
    } else {
      await rejectDriverOrder(order.id, DRIVER_ID);
      setFeedback(`تم رفض ${order.orderNumber} وسيظهر لمندوب متاح آخر.`);
    }
    await load();
  };

  return (
    <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}><Text style={{ color: colors.foreground, fontSize: 22 }}>‹</Text></Pressable>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.kicker, { color: colors.muted }]}>زاك للمندوب</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>الطلبات القريبة</Text>
        </View>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />} contentContainerStyle={styles.content}>
        <View style={[styles.statusCard, { backgroundColor: available ? "#111111" : colors.surface, borderColor: available ? "#111111" : colors.border }]}>
          <View style={styles.statusDot} />
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={[styles.statusTitle, { color: available ? "#FFFFFF" : colors.foreground }]}>{available ? "أنت متاح لاستقبال طلب" : "أنت غير متاح حالياً"}</Text>
            <Text style={[styles.statusSub, { color: available ? "#D1D5DB" : colors.muted }]}>{available ? "تظهر لك الطلبات القريبة داخل نطاق 10 كم" : "فعّل حالة التوفر من شاشة العهدة"}</Text>
          </View>
        </View>

        {activeOrderId ? <View style={[styles.lockCard, { backgroundColor: "#FFF9D6", borderColor: "#FFD21F" }]}><Text style={styles.lockText}>لديك رحلة نشطة. يمكنك قبول طلب مطعم واحد فقط في كل رحلة.</Text><Pressable onPress={() => router.push(`/driver/update-order?orderId=${activeOrderId}`)} style={styles.smallButton}><Text style={styles.smallButtonText}>تحديث الرحلة</Text></Pressable></View> : null}
        {feedback ? <Text style={[styles.feedback, { color: feedback.startsWith("تم") ? "#15803D" : "#B91C1C" }]}>{feedback}</Text> : null}

        {!available ? <View style={[styles.empty, { backgroundColor: colors.surface }]}><Text style={[styles.emptyTitle, { color: colors.foreground }]}>فعّل التوفر أولاً</Text><Text style={[styles.emptyText, { color: colors.muted }]}>عندما تكون متاحاً، ستظهر لك الرحلات القريبة تلقائياً.</Text><Pressable onPress={() => router.push("/driver/custody")} style={styles.primaryButton}><Text style={styles.primaryText}>فتح شاشة العهدة</Text></Pressable></View> : orders.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.surface }]}><Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد طلبات قريبة الآن</Text><Text style={[styles.emptyText, { color: colors.muted }]}>اسحب الشاشة للتحديث أو انتظر طلباً جديداً.</Text></View> : orders.map((order) => <View key={order.id} style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.orderTop}><Text style={[styles.orderNumber, { color: colors.foreground }]}>{order.orderNumber}</Text><Text style={[styles.badge, { backgroundColor: "#FFD21F", color: "#111111" }]}>ضمن 10 كم</Text></View><Text style={[styles.store, { color: colors.foreground }]}>{order.storeName}</Text><Text style={[styles.detail, { color: colors.muted }]}>{order.address}</Text><View style={styles.orderBottom}><Text style={[styles.total, { color: colors.foreground }]}>{order.total + order.deliveryFee} د.ل</Text><View style={styles.actions}><Pressable onPress={() => void respond(order, "reject")} style={[styles.rejectButton, { borderColor: colors.border }]}><Text style={[styles.rejectText, { color: colors.foreground }]}>رفض</Text></Pressable><Pressable onPress={() => void respond(order, "accept")} style={styles.acceptButton}><Text style={styles.acceptText}>قبول الرحلة</Text></Pressable></View></View></View>)}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { height: 62, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  kicker: { fontSize: 11, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "900", marginTop: 2 },
  content: { paddingBottom: 32, gap: 12 },
  statusCard: { minHeight: 78, borderRadius: 20, borderWidth: 1, padding: 15, flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFD21F" },
  statusTitle: { fontSize: 14, fontWeight: "900" },
  statusSub: { fontSize: 11, marginTop: 3, textAlign: "right" },
  lockCard: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10, alignItems: "flex-end" },
  lockText: { color: "#111111", fontSize: 12, fontWeight: "800", textAlign: "right", lineHeight: 19 },
  smallButton: { backgroundColor: "#111111", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  feedback: { textAlign: "right", fontSize: 11, fontWeight: "800", lineHeight: 18 },
  empty: { borderRadius: 20, padding: 22, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "900" },
  emptyText: { fontSize: 12, textAlign: "center", lineHeight: 19 },
  primaryButton: { backgroundColor: "#FFD21F", borderRadius: 13, paddingHorizontal: 15, paddingVertical: 11, marginTop: 4 },
  primaryText: { color: "#111111", fontSize: 12, fontWeight: "900" },
  orderCard: { borderRadius: 20, borderWidth: 1, padding: 15, gap: 8 },
  orderTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  orderNumber: { fontSize: 12, fontWeight: "900" },
  badge: { fontSize: 10, fontWeight: "900", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  store: { textAlign: "right", fontSize: 17, fontWeight: "900" },
  detail: { textAlign: "right", fontSize: 11 },
  orderBottom: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  total: { fontSize: 14, fontWeight: "900" },
  actions: { flexDirection: "row-reverse", gap: 7 },
  rejectButton: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9 },
  rejectText: { fontSize: 11, fontWeight: "900" },
  acceptButton: { backgroundColor: "#FFD21F", borderRadius: 11, paddingHorizontal: 13, paddingVertical: 10 },
  acceptText: { color: "#111111", fontSize: 11, fontWeight: "900" },
});
