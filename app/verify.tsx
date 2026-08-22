import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { requestOtp, verifyOtp, otpSecondsLeft } from "@/lib/otp";
import { saveSession } from "@/lib/session";

export default function VerifyScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ role?: "customer" | "driver"; mode?: "login" | "signup"; name?: string; phone?: string }>();
  const phone = String(params.phone ?? "");
  const role = params.role === "driver" ? "driver" : "customer";
  const mode = params.mode === "login" ? "login" : "signup";
  const name = String(params.name ?? (role === "driver" ? "سائق زاك" : "زبون زاك"));
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const maskedPhone = useMemo(() => phone.length > 4 ? `${phone.slice(0, 3)} **** ${phone.slice(-2)}` : phone, [phone]);

  const sendCode = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await requestOtp(phone);
      setExpiresAt(result.expiresAt);
      setSeconds(otpSecondsLeft(result.expiresAt));
      setDevCode(result.devCode);
      setCode("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إرسال الرمز");
    } finally {
      setBusy(false);
    }
  }, [phone]);

  useEffect(() => { void sendCode(); }, [sendCode]);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => setSeconds(otpSecondsLeft(expiresAt)), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const confirm = async () => {
    setBusy(true);
    const result = await verifyOtp(phone, code);
    if (!result.ok) {
      const labels = { missing: "اطلبي رمزاً جديداً", phone: "رقم الهاتف تغيّر", expired: "انتهت صلاحية الرمز", locked: "تجاوزتِ عدد المحاولات", invalid: "الرمز غير صحيح" };
      setMessage(labels[result.reason]);
      setBusy(false);
      return;
    }
    await saveSession({ role, name, phone, signedInAt: new Date().toISOString() });
    if (mode === "signup") router.replace("/location");
    else router.replace("/(tabs)");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5" containerClassName="bg-background">
      <View style={styles.topBar}><Pressable onPress={() => router.back()} style={styles.back}><IconSymbol name="chevron.right" size={22} color={colors.foreground} /></Pressable><Text style={[styles.help, { color: colors.muted }]}>تحقق آمن</Text></View>
      <View style={styles.hero}><View style={styles.logo}><Text style={styles.logoText}>Z</Text></View><Text style={[styles.title, { color: colors.foreground }]}>أكد رقمك</Text><Text style={[styles.subtitle, { color: colors.muted }]}>أرسلنا رمزاً من 6 أرقام إلى واتساب</Text><Text style={[styles.phone, { color: colors.foreground }]}>{maskedPhone}</Text></View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.foreground }]}>رمز التحقق</Text>
        <TextInput value={code} onChangeText={(value) => setCode(value.replace(/[^0-9]/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} textAlign="center" placeholder="••••••" placeholderTextColor={colors.muted} style={[styles.codeInput, { color: colors.foreground, borderColor: colors.border }]} />
        <Text style={[styles.hint, { color: colors.muted }]}>ينتهي الرمز خلال {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</Text>
        {devCode && <Text style={[styles.devHint, { color: colors.muted }]}>وضع التطوير: الرمز {devCode}</Text>}
        {!!message && <Text style={styles.error}>{message}</Text>}
        <Pressable disabled={busy || code.length !== 6} onPress={confirm} style={[styles.primaryButton, (busy || code.length !== 6) && styles.disabled]}><Text style={styles.primaryText}>{busy ? "جارٍ التحقق..." : "تأكيد الحساب"}</Text><IconSymbol name="checkmark" size={18} color="#111111" /></Pressable>
        <Pressable disabled={busy || seconds > 0} onPress={sendCode} style={styles.resend}><Text style={[styles.resendText, { color: seconds > 0 ? colors.muted : colors.primary }]}>{seconds > 0 ? "يمكن إعادة الإرسال بعد انتهاء العداد" : "إعادة إرسال الرمز"}</Text></Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ topBar: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }, back: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }, help: { fontSize: 13, fontWeight: "700" }, hero: { alignItems: "center", marginTop: 48, marginBottom: 26 }, logo: { width: 68, height: 68, borderRadius: 22, backgroundColor: "#111111", alignItems: "center", justifyContent: "center", marginBottom: 18 }, logoText: { color: "#FFD21F", fontSize: 42, fontWeight: "900", fontStyle: "italic" }, title: { fontSize: 27, fontWeight: "900" }, subtitle: { fontSize: 13, marginTop: 8 }, phone: { fontSize: 15, fontWeight: "800", marginTop: 8 }, card: { borderRadius: 22, borderWidth: 1, padding: 18 }, label: { textAlign: "right", fontSize: 14, fontWeight: "800", marginBottom: 10 }, codeInput: { height: 60, borderWidth: 1, borderRadius: 16, fontSize: 27, fontWeight: "900", letterSpacing: 9 }, hint: { textAlign: "center", fontSize: 12, marginTop: 11 }, devHint: { textAlign: "center", fontSize: 11, marginTop: 6 }, error: { textAlign: "center", color: "#C62828", fontSize: 12, fontWeight: "700", marginTop: 10 }, primaryButton: { height: 54, backgroundColor: "#FFD21F", borderRadius: 16, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 18 }, primaryText: { color: "#111111", fontSize: 15, fontWeight: "900" }, disabled: { opacity: 0.5 }, resend: { alignItems: "center", paddingVertical: 16 }, resendText: { fontSize: 13, fontWeight: "800" } });
