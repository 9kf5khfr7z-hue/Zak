export type ZakLanguage = "ar" | "en";

export const zakTranslations = {
  ar: {
    brand: "زاك",
    tagline: "طلبت → زاك استلم → زاك وصل",
    home: "الرئيسية",
    services: "الخدمات",
    orders: "طلباتي",
    favorites: "المفضلة",
    wallet: "المحفظة",
    profile: "الحساب",
    restaurants: "مطاعم",
    groceries: "متاجر",
    pharmacies: "صيدليات",
    parcels: "زاك Box",
    errands: "زاك مشوار",
    express: "زاك الآن",
    support: "الدعم والشكاوى",
    confirm: "تأكيد",
    cancel: "إلغاء",
    retry: "إعادة المحاولة",
    cash: "الدفع نقداً",
    electronic: "الدفع إلكترونياً",
    tenKmLimit: "نطاق التوصيل الأقصى 10 كم",
  },
  en: {
    brand: "ZAK",
    tagline: "Ordered → ZAK picked up → ZAK delivered",
    home: "Home",
    services: "Services",
    orders: "My orders",
    favorites: "Favorites",
    wallet: "Wallet",
    profile: "Profile",
    restaurants: "Restaurants",
    groceries: "Stores",
    pharmacies: "Pharmacies",
    parcels: "ZAK Box",
    errands: "ZAK Meshwar",
    express: "ZAK Now",
    support: "Support & complaints",
    confirm: "Confirm",
    cancel: "Cancel",
    retry: "Retry",
    cash: "Cash payment",
    electronic: "Electronic payment",
    tenKmLimit: "Maximum delivery radius: 10 km",
  },
} as const;

export type ZakTranslationKey = keyof typeof zakTranslations.ar;

export function translate(language: ZakLanguage, key: ZakTranslationKey): string {
  return zakTranslations[language][key];
}

export function isRtl(language: ZakLanguage): boolean {
  return language === "ar";
}
