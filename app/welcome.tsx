import { useEffect, useState } from "react";
import { ImageBackground, I18nManager, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";

const welcomeArtwork = require("@/assets/images/welcome-screen.png");

export default function WelcomeScreen() {
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const isArabic = language === "ar";

  useEffect(() => {
    AsyncStorage.getItem("zak-language").then((saved) => {
      if (saved === "ar" || saved === "en") setLanguage(saved);
    });
  }, []);

  const changeLanguage = (next: "ar" | "en") => {
    setLanguage(next);
    AsyncStorage.setItem("zak-language", next);
    I18nManager.allowRTL(next === "ar");
  };

  const copy = isArabic
    ? {
        title: "كل طلباتك توصلك بسرعة",
        subtitle: "مطاعم، مواد غذائية، صيدليات ومحلات هواتف في مكان واحد.",
        start: "ابدأ الآن",
        login: "لديك حساب؟ تسجيل الدخول",
      }
    : {
        title: "Everything you need, delivered fast",
        subtitle: "Restaurants, groceries, pharmacies, and phone stores in one place.",
        start: "Get started",
        login: "Already have an account? Sign in",
      };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F7B900]">
      <ImageBackground source={welcomeArtwork} resizeMode="cover" style={styles.background}>
        <View style={styles.overlay} />
        <View style={[styles.content, { direction: isArabic ? "rtl" : "ltr" }]}>
          <View style={styles.topRow}>
            <View style={styles.topSpace} />
            <View style={styles.languageSwitch}>
              <Pressable onPress={() => changeLanguage("ar")} style={[styles.languageOption, isArabic && styles.activeLanguage]}>
                <Text style={[styles.languageText, isArabic && styles.activeLanguageText]}>العربية</Text>
              </Pressable>
              <Pressable onPress={() => changeLanguage("en")} style={[styles.languageOption, !isArabic && styles.activeLanguage]}>
                <Text style={[styles.languageText, !isArabic && styles.activeLanguageText]}>English</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.bottomBlock}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
            <Pressable
              onPress={() => router.replace("/auth")}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>{copy.start}</Text>
            </Pressable>
            <Pressable onPress={() => router.replace("/auth")} style={styles.loginButton}>
              <Text style={styles.loginText}>{copy.login}</Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255, 190, 0, 0.14)" },
  content: { flex: 1, paddingHorizontal: 24, paddingVertical: 28, justifyContent: "space-between" },
  topRow: { alignItems: "flex-end" },
  topSpace: { height: 24 },
  languageSwitch: { alignSelf: "flex-end", flexDirection: "row", backgroundColor: "rgba(7, 17, 38, 0.14)", borderRadius: 16, padding: 3 },
  languageOption: { minWidth: 72, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  activeLanguage: { backgroundColor: "#071126" },
  languageText: { color: "#071126", fontSize: 12, fontWeight: "800" },
  activeLanguageText: { color: "#FFC400" },
  bottomBlock: { alignItems: "center", paddingBottom: 10 },
  title: { color: "#071126", fontSize: 22, lineHeight: 30, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#263043", fontSize: 13, lineHeight: 21, textAlign: "center", marginTop: 8, maxWidth: 320 },
  primaryButton: { width: "100%", height: 56, borderRadius: 18, backgroundColor: "#071126", alignItems: "center", justifyContent: "center", marginTop: 22 },
  primaryText: { color: "#FFC400", fontSize: 16, fontWeight: "900" },
  loginButton: { height: 44, alignItems: "center", justifyContent: "center", marginTop: 4 },
  loginText: { color: "#071126", fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
