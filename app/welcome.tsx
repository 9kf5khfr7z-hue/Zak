import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";

const welcomeArtwork = require("@/assets/images/welcome-screen.png");

export default function WelcomeScreen() {
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-[#F7B900]">
      <ImageBackground source={welcomeArtwork} resizeMode="cover" style={styles.background}>
        <View style={styles.overlay} />
        <View style={styles.content}>
          <View style={styles.topSpace} />
          <View style={styles.bottomBlock}>
            <Text style={styles.title}>كل طلباتك توصلك بسرعة</Text>
            <Text style={styles.subtitle}>مطاعم، مواد غذائية، صيدليات ومحلات هواتف في مكان واحد.</Text>
            <Pressable
              onPress={() => router.replace("/auth")}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>ابدأ الآن</Text>
            </Pressable>
            <Pressable onPress={() => router.replace("/auth")} style={styles.loginButton}>
              <Text style={styles.loginText}>لديك حساب؟ تسجيل الدخول</Text>
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
  topSpace: { height: 24 },
  bottomBlock: { alignItems: "center", paddingBottom: 10 },
  title: { color: "#071126", fontSize: 22, lineHeight: 30, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#263043", fontSize: 13, lineHeight: 21, textAlign: "center", marginTop: 8, maxWidth: 320 },
  primaryButton: { width: "100%", height: 56, borderRadius: 18, backgroundColor: "#071126", alignItems: "center", justifyContent: "center", marginTop: 22 },
  primaryText: { color: "#FFC400", fontSize: 16, fontWeight: "900" },
  loginButton: { height: 44, alignItems: "center", justifyContent: "center", marginTop: 4 },
  loginText: { color: "#071126", fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
