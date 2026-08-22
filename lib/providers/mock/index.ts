export type MockProviderResult = { ok: true; provider: "mock"; reference: string; message: string };

export async function requestMockOtp(phone: string): Promise<MockProviderResult & { code: string }> {
  if (!phone.trim()) throw new Error("Phone is required");
  return { ok: true, provider: "mock", reference: `otp-${Date.now()}`, code: "123456", message: "تم إنشاء رمز تجريبي محلي" };
}

export async function sendMockSms(phone: string, message: string): Promise<MockProviderResult> {
  return { ok: true, provider: "mock", reference: `sms-${Date.now()}`, message: `محاكاة SMS إلى ${phone}: ${message}` };
}

export async function sendMockWhatsApp(phone: string, message: string): Promise<MockProviderResult> {
  return { ok: true, provider: "mock", reference: `whatsapp-${Date.now()}`, message: `محاكاة WhatsApp إلى ${phone}: ${message}` };
}

export async function chargeMockPayment(amount: number, reference: string): Promise<MockProviderResult> {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Payment amount must be positive");
  return { ok: true, provider: "mock", reference: `payment-${Date.now()}`, message: `محاكاة دفع ${amount.toFixed(2)} د.ل للطلب ${reference}` };
}

export async function requestMockBankTransfer(amount: number, reference: string): Promise<MockProviderResult> {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Transfer amount must be positive");
  return { ok: true, provider: "mock", reference: `bank-${Date.now()}`, message: `محاكاة تحويل مصرفي ${amount.toFixed(2)} د.ل للطلب ${reference}` };
}
