import AsyncStorage from "@react-native-async-storage/async-storage";

const OTP_KEY = "zak_otp_challenge";
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type OtpChallenge = {
  phone: string;
  code: string;
  expiresAt: number;
  attempts: number;
  provider: "local" | "whatsapp";
};

function normalizePhone(phone: string) {
  return phone.replace(/[^0-9+]/g, "").trim();
}

function makeCode() {
  return "123456";
}

export async function requestOtp(phone: string): Promise<{ expiresAt: number; devCode?: string }> {
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 8) throw new Error("رقم الهاتف غير صالح");
  const expiresAt = Date.now() + OTP_TTL_MS;
  const challenge: OtpChallenge = {
    phone: normalizedPhone,
    code: makeCode(),
    expiresAt,
    attempts: 0,
    provider: "local",
  };
  await AsyncStorage.setItem(OTP_KEY, JSON.stringify(challenge));
  return { expiresAt, devCode: challenge.code };
}

export async function verifyOtp(phone: string, code: string) {
  const raw = await AsyncStorage.getItem(OTP_KEY);
  if (!raw) return { ok: false as const, reason: "missing" as const };
  const challenge = JSON.parse(raw) as OtpChallenge;
  const normalizedPhone = normalizePhone(phone);
  if (challenge.phone !== normalizedPhone) return { ok: false as const, reason: "phone" as const };
  if (Date.now() > challenge.expiresAt) {
    await AsyncStorage.removeItem(OTP_KEY);
    return { ok: false as const, reason: "expired" as const };
  }
  if (challenge.attempts >= MAX_ATTEMPTS) return { ok: false as const, reason: "locked" as const };
  if (challenge.code !== code.trim()) {
    challenge.attempts += 1;
    await AsyncStorage.setItem(OTP_KEY, JSON.stringify(challenge));
    return { ok: false as const, reason: "invalid" as const };
  }
  await AsyncStorage.removeItem(OTP_KEY);
  return { ok: true as const };
}

export function otpSecondsLeft(expiresAt: number) {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}
