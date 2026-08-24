import AsyncStorage from "@react-native-async-storage/async-storage";

export type DriverRating = {
  id: string;
  orderId: string;
  driverId: string;
  rating: number;
  comment: string;
  createdAt: string;
};

const RATINGS_KEY = "zak_driver_ratings_v1";

async function getRatings(): Promise<DriverRating[]> {
  try {
    const raw = await AsyncStorage.getItem(RATINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DriverRating[]) : [];
  } catch {
    return [];
  }
}

export type DriverRatingStats = {
  average: number;
  count: number;
};

export async function getDriverRating(orderId: string): Promise<DriverRating | null> {
  return (await getRatings()).find((rating) => rating.orderId === orderId) ?? null;
}

export async function getDriverRatingStats(): Promise<DriverRatingStats> {
  const ratings = await getRatings();
  if (ratings.length === 0) return { average: 0, count: 0 };

  const total = ratings.reduce((sum, item) => sum + item.rating, 0);
  return { average: Number((total / ratings.length).toFixed(1)), count: ratings.length };
}

export async function submitDriverRating(input: {
  orderId: string;
  driverId: string;
  orderStatus: string;
  rating: number;
  comment?: string;
}): Promise<DriverRating> {
  if (input.orderStatus !== "delivered") {
    throw new Error("لا يمكن تقييم السائق قبل اكتمال الرحلة");
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error("التقييم يجب أن يكون من نجمة إلى خمس نجوم");
  }

  const ratings = await getRatings();
  if (ratings.some((rating) => rating.orderId === input.orderId)) {
    throw new Error("تم تقييم هذه الرحلة من قبل");
  }

  const now = new Date().toISOString();
  const rating: DriverRating = {
    id: `driver-rating-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    orderId: input.orderId,
    driverId: input.driverId,
    rating: input.rating,
    comment: input.comment?.trim() ?? "",
    createdAt: now,
  };

  await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify([rating, ...ratings]));
  return rating;
}

export async function resetDriverRatings() {
  await AsyncStorage.removeItem(RATINGS_KEY);
}
