import AsyncStorage from "@react-native-async-storage/async-storage";

export type SupportRole = "customer" | "driver";
export type TicketStatus = "open" | "in_progress" | "resolved";
export type SupportTicket = { id: string; role: SupportRole; category: string; orderNumber: string; description: string; imageUri?: string; status: TicketStatus; supportReply?: string; createdAt: string };

const SUPPORT_KEY = "zak_support_tickets_v1";

export async function getTickets(): Promise<SupportTicket[]> {
  try { const raw = await AsyncStorage.getItem(SUPPORT_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

export async function createTicket(input: Pick<SupportTicket, "role" | "category" | "orderNumber" | "description" | "imageUri">) {
  const ticket: SupportTicket = { id: `ticket-${Date.now()}`, ...input, status: "open", createdAt: new Date().toISOString() };
  const tickets = await getTickets();
  await AsyncStorage.setItem(SUPPORT_KEY, JSON.stringify([ticket, ...tickets]));
  return ticket;
}

export function getTicketStatusLabel(status: TicketStatus) {
  if (status === "in_progress") return "قيد المتابعة";
  if (status === "resolved") return "تم الحل";
  return "مفتوحة";
}
