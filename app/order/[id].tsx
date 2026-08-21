import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Region } from "react-native-maps";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { addOrderMessage, getEtaLabel, getOrder, getStatusLabel, getTrackingLabel, type Order } from "@/lib/orders";
import { LocationMap } from "@/components/location-map";

export default function OrderDetailsScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    if (id) setOrder(await getOrder(id));
  }, [id]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const sendMessage = async () => {
    if (!order || !message.trim()) return;
    const next = await addOrderMessage(order.id, "customer", message);
    setOrder(next);
    setMessage("");
  };

  if (!order) return <ScreenContainer className="px-5"><View style={styles.notFound}><Text style={[styles.title, { color: colors.foreground }]}>الطلب غير موجود</Text><Pressable onPress={() => router.replace("/(tabs)/orders")} style={styles.button}><Text style={styles.buttonText}>العودة إلى طلباتي</Text></Pressable></View></ScreenContainer>;

  const driverRegion: Region = { ...order.tracking.driverCoordinates, latitudeDelta: 0.035, longitudeDelta: 0.035 };
  const formatTime = (value: string | null) => value ? new Date(value).toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" }) : "بانتظار التحديث";
  const timelineItems = [
    { key: "received", title: "استلم المطعم الطلب", time: order.timeline.restaurantReceivedAt },
    { key: "preparing", title: "بدأ المطعم تجهيز الطلب", time: order.timeline.preparingAt },
    { key: "picked-up", title: "استلم السائق الطلب", time: order.timeline.driverPickedUpAt },
    { key: "delivered", title: "وصلت الطلبية للزبون", time: order.timeline.deliveredAt },
  ];

  return <ScreenContainer className="px-5" edges={["top", "bottom", "left", "right"]}>
    <View style={styles.header}><Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.surface }]}><IconSymbol name="chevron.right" size={22} color={colors.foreground} /></Pressable><Text style={[styles.title, { color: colors.foreground }]}>تفاصيل الطلب</Text><View style={{ width: 42 }} /></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={[styles.numberCard, { backgroundColor: "#FFF7E0", borderColor: "#F6D365" }]}><View style={styles.numberIcon}><IconSymbol name="bag.fill" size={23} color="#D99A00" /></View><View style={styles.numberCopy}><Text style={[styles.numberLabel, { color: colors.muted }]}>رقم الطلب</Text><Text style={[styles.number, { color: colors.foreground }]}>{order.orderNumber}</Text></View></View>
      <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.statusDot, { backgroundColor: order.status === "delivered" ? "#16A34A" : colors.primary }]} /><View style={styles.statusCopy}><Text style={[styles.statusLabel, { color: colors.muted }]}>حالة الطلب</Text><Text style={[styles.status, { color: colors.foreground }]}>{getStatusLabel(order.status)}</Text></View><IconSymbol name="bicycle" size={28} color={colors.primary} /></View>
      <View style={styles.trackingHeader}><Text style={[styles.section, { color: colors.foreground }]}>تتبع الطلب</Text><Pressable onPress={refresh} style={[styles.refreshButton, { backgroundColor: "#EEF2FF" }]}><IconSymbol name="arrow.clockwise" size={16} color={colors.primary} /><Text style={[styles.refreshText, { color: colors.primary }]}>تحديث</Text></Pressable></View>
      <View style={[styles.mapCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.mapWrap}><LocationMap initialRegion={driverRegion} region={driverRegion} onRegionChangeComplete={() => undefined} /></View>
        <View style={styles.trackingSummary}><View style={[styles.trackingIcon, { backgroundColor: order.status === "delivered" ? "#DCFCE7" : "#FFF7E0" }]}><IconSymbol name={order.status === "delivered" ? "checkmark" : "location.fill"} size={20} color={order.status === "delivered" ? "#16A34A" : "#D99A00"} /></View><View style={styles.trackingCopy}><Text style={[styles.trackingTitle, { color: colors.foreground }]}>{getTrackingLabel(order.status)}</Text><Text style={[styles.trackingEta, { color: colors.muted }]}>{getEtaLabel(order)}</Text></View></View>
        <View style={[styles.trackingMeta, { backgroundColor: colors.background }]}><Text style={[styles.metaValue, { color: colors.foreground }]}>{order.tracking.driverCoordinates.latitude.toFixed(4)}, {order.tracking.driverCoordinates.longitude.toFixed(4)}</Text><Text style={[styles.metaLabel, { color: colors.muted }]}>آخر موقع مسجل</Text></View>
      </View>
      <Text style={[styles.section, { color: colors.foreground }]}>الخط الزمني</Text>
      <View style={[styles.timelineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {timelineItems.map((item, index) => {
          const completed = Boolean(item.time);
          return <View key={item.key} style={styles.timelineRow}>
            <View style={styles.timelineRail}>{index < timelineItems.length - 1 ? <View style={[styles.timelineLine, { backgroundColor: completed ? colors.primary : colors.border }]} /> : null}<View style={[styles.timelineDot, { backgroundColor: completed ? colors.primary : colors.border }]}>{completed ? <IconSymbol name="checkmark" size={11} color="#FFFFFF" /> : null}</View></View>
            <View style={styles.timelineCopy}><Text style={[styles.timelineTitle, { color: completed ? colors.foreground : colors.muted }]}>{item.title}</Text><Text style={[styles.timelineTime, { color: completed ? colors.primary : colors.muted }]}>{formatTime(item.time)}</Text></View>
          </View>;
        })}
      </View>
      <Text style={[styles.section, { color: colors.foreground }]}>ملخص الطلب</Text>
      <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.line}><Text style={[styles.value, { color: colors.foreground }]}>{order.storeName}</Text><Text style={[styles.label, { color: colors.muted }]}>المتجر</Text></View><View style={styles.line}><Text style={[styles.value, { color: colors.foreground }]}>{order.total.toFixed(2)} د.ل</Text><Text style={[styles.label, { color: colors.muted }]}>الإجمالي</Text></View><View style={styles.line}><Text style={[styles.value, { color: colors.foreground }]}>{order.payment === "cash" ? "الدفع عند الاستلام" : "بطاقة مصرفية"}</Text><Text style={[styles.label, { color: colors.muted }]}>الدفع</Text></View><View style={styles.line}><Text style={[styles.value, { color: colors.foreground }]}>{order.address}</Text><Text style={[styles.label, { color: colors.muted }]}>العنوان</Text></View></View>
      <View style={styles.driverHeader}><Text style={[styles.section, { color: colors.foreground }]}>تواصل مع السائق</Text><Pressable onPress={() => Linking.openURL(`tel:${order.driverPhone.replace(/\s/g, "")}`)} style={[styles.callButton, { backgroundColor: "#EEF2FF" }]}>
<IconSymbol name="phone.fill" size={17} color={colors.primary} /><Text style={[styles.callText, { color: colors.primary }]}>اتصال</Text></Pressable></View>
      <View style={[styles.driverCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.driverAvatar}><IconSymbol name="person.fill" size={24} color={colors.primary} /></View><View style={styles.driverCopy}><Text style={[styles.driverName, { color: colors.foreground }]}>{order.driverName}</Text><Text style={[styles.driverPhone, { color: colors.muted }]}>{order.driverPhone}</Text></View></View>
      <View style={[styles.chat, { backgroundColor: colors.surface, borderColor: colors.border }]}>{order.messages.map((item) => <View key={item.id} style={[styles.bubble, item.sender === "customer" ? styles.customerBubble : styles.driverBubble, { backgroundColor: item.sender === "customer" ? "#FFF7E0" : colors.background }]}><Text style={[styles.bubbleSender, { color: colors.muted }]}>{item.sender === "customer" ? "أنت" : "السائق"}</Text><Text style={[styles.bubbleText, { color: colors.foreground }]}>{item.text}</Text></View>)}<View style={styles.composer}><Pressable onPress={sendMessage} style={styles.send}><IconSymbol name="paperplane.fill" size={18} color="#111827" /></Pressable><TextInput value={message} onChangeText={setMessage} placeholder="اكتب رسالة للسائق..." placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} textAlign="right" returnKeyType="send" onSubmitEditing={sendMessage} /></View></View>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({ header: { height: 58, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, title: { fontSize: 18, fontWeight: "900" }, content: { paddingBottom: 25 }, numberCard: { borderWidth: 1, borderRadius: 19, padding: 14, flexDirection: "row-reverse", alignItems: "center", gap: 11 }, numberIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#FFC400", alignItems: "center", justifyContent: "center" }, numberCopy: { flex: 1, alignItems: "flex-end" }, numberLabel: { fontSize: 11 }, number: { fontSize: 19, fontWeight: "900", letterSpacing: 0.5, marginTop: 3 }, statusCard: { borderWidth: 1, borderRadius: 17, padding: 14, marginTop: 11, flexDirection: "row-reverse", alignItems: "center", gap: 11 }, statusDot: { width: 12, height: 12, borderRadius: 6 }, statusCopy: { flex: 1, alignItems: "flex-end" }, statusLabel: { fontSize: 11 }, status: { fontSize: 15, fontWeight: "900", marginTop: 3 }, section: { textAlign: "right", fontSize: 17, fontWeight: "900", marginTop: 22, marginBottom: 10 }, trackingHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 5 }, refreshButton: { flexDirection: "row-reverse", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }, refreshText: { fontSize: 11, fontWeight: "900" }, mapCard: { borderWidth: 1, borderRadius: 17, padding: 10, gap: 10 }, mapWrap: { height: 185, borderRadius: 13, overflow: "hidden" }, trackingSummary: { flexDirection: "row-reverse", alignItems: "center", gap: 9 }, trackingIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, trackingCopy: { flex: 1, alignItems: "flex-end" }, trackingTitle: { fontSize: 13, fontWeight: "900" }, trackingEta: { fontSize: 11, marginTop: 3 }, trackingMeta: { borderRadius: 10, padding: 9, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }, metaValue: { fontSize: 10, fontVariant: ["tabular-nums"] }, metaLabel: { fontSize: 10 }, timelineCard: { borderWidth: 1, borderRadius: 17, padding: 14, gap: 3 }, timelineRow: { flexDirection: "row-reverse", minHeight: 51 }, timelineRail: { width: 24, alignItems: "center", position: "relative" }, timelineLine: { position: "absolute", top: 15, bottom: -3, width: 2 }, timelineDot: { width: 19, height: 19, borderRadius: 10, alignItems: "center", justifyContent: "center", zIndex: 1 }, timelineCopy: { flex: 1, alignItems: "flex-end", paddingRight: 9 }, timelineTitle: { fontSize: 12, fontWeight: "800" }, timelineTime: { fontSize: 11, marginTop: 3 }, detailsCard: { borderWidth: 1, borderRadius: 17, padding: 14, gap: 12 }, line: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 12 }, label: { fontSize: 11 }, value: { flex: 1, textAlign: "right", fontSize: 12, fontWeight: "800" }, driverHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, callButton: { flexDirection: "row-reverse", alignItems: "center", gap: 5, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 8 }, callText: { fontSize: 11, fontWeight: "900" }, driverCard: { borderWidth: 1, borderRadius: 17, padding: 13, flexDirection: "row-reverse", alignItems: "center", gap: 10 }, driverAvatar: { width: 45, height: 45, borderRadius: 15, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }, driverCopy: { flex: 1, alignItems: "flex-end" }, driverName: { fontSize: 13, fontWeight: "900" }, driverPhone: { fontSize: 11, marginTop: 4 }, chat: { borderWidth: 1, borderRadius: 17, padding: 12, marginTop: 11, gap: 8 }, bubble: { maxWidth: "86%", borderRadius: 14, padding: 10 }, customerBubble: { alignSelf: "flex-end", borderBottomRightRadius: 5 }, driverBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 5 }, bubbleSender: { fontSize: 10, textAlign: "right", marginBottom: 3 }, bubbleText: { fontSize: 12, textAlign: "right", lineHeight: 18 }, composer: { flexDirection: "row-reverse", alignItems: "center", gap: 7, marginTop: 4 }, input: { flex: 1, height: 44, borderWidth: 1, borderRadius: 13, paddingHorizontal: 11, fontSize: 12 }, send: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#FFC400", alignItems: "center", justifyContent: "center" }, notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }, button: { backgroundColor: "#FFC400", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13 }, buttonText: { color: "#111827", fontWeight: "900" } });
