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

export type FavoritesState = {
  stores: FavoriteStore[];
  products: FavoriteProduct[];
};

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
