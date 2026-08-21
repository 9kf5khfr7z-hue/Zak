import AsyncStorage from "@react-native-async-storage/async-storage";

export type FavoriteStore = {
  id: string;
  name: string;
  category: string;
  subtitle: string;
  distance: string;
  time: string;
  rating: string;
  icon: string;
};

export type FavoriteProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  storeId: string;
  storeName: string;
};

export type FavoriteOffer = {
  id: string;
  storeId: string;
  storeName: string;
  title: string;
  detail: string;
  discount: string;
  isRead: boolean;
};

export type FavoritesState = {
  stores: FavoriteStore[];
  products: FavoriteProduct[];
};

const availableOffers: FavoriteOffer[] = [
  { id: "offer-store-1", storeId: "1", storeName: "مذاق المدينة", title: "خصم 20% على الوجبات العائلية", detail: "العرض متاح حتى نهاية الأسبوع", discount: "20%", isRead: false },
  { id: "offer-store-2", storeId: "2", storeName: "سوق الخير", title: "توصيل مجاني على مشترياتك", detail: "للطلبات داخل نطاق 5 كم", discount: "مجاني", isRead: false },
];

const FAVORITES_KEY = "zak_favorites_v1";

const emptyFavorites: FavoritesState = { stores: [], products: [] };

export async function getFavorites(): Promise<FavoritesState> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!raw) return emptyFavorites;
    const parsed = JSON.parse(raw) as Partial<FavoritesState>;
    return {
      stores: Array.isArray(parsed.stores) ? parsed.stores : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
    };
  } catch {
    return emptyFavorites;
  }
}

async function saveFavorites(next: FavoritesState) {
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

export async function toggleFavoriteStore(store: FavoriteStore) {
  const current = await getFavorites();
  const exists = current.stores.some((item) => item.id === store.id);
  return saveFavorites({
    ...current,
    stores: exists ? current.stores.filter((item) => item.id !== store.id) : [store, ...current.stores],
  });
}

export async function toggleFavoriteProduct(product: FavoriteProduct) {
  const current = await getFavorites();
  const exists = current.products.some((item) => item.id === product.id && item.storeId === product.storeId);
  return saveFavorites({
    ...current,
    products: exists
      ? current.products.filter((item) => !(item.id === product.id && item.storeId === product.storeId))
      : [product, ...current.products],
  });
}

export async function clearFavorites() {
  await AsyncStorage.removeItem(FAVORITES_KEY);
}

const READ_OFFERS_KEY = "zak_read_favorite_offers_v1";

export async function getOffersForStores(storeIds: string[]): Promise<FavoriteOffer[]> {
  const readIds = JSON.parse((await AsyncStorage.getItem(READ_OFFERS_KEY)) ?? "[]") as string[];
  return availableOffers.filter((offer) => storeIds.includes(offer.storeId)).map((offer) => ({ ...offer, isRead: readIds.includes(offer.id) }));
}

export async function getNewOffersCount(storeIds: string[]) {
  const offers = await getOffersForStores(storeIds);
  return offers.filter((offer) => !offer.isRead).length;
}

export async function markOffersRead(offerIds: string[]) {
  const current = JSON.parse((await AsyncStorage.getItem(READ_OFFERS_KEY)) ?? "[]") as string[];
  const next = Array.from(new Set([...current, ...offerIds]));
  await AsyncStorage.setItem(READ_OFFERS_KEY, JSON.stringify(next));
}
