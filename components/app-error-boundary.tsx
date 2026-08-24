import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { recordAppIncident } from "@/lib/app-incidents";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void recordAppIncident(error, info.componentStack?.trim() ? "واجهة التطبيق" : "خطأ عرض");
  }

  retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.logo}>ZAK</Text>
          <Text style={styles.title}>صار خلل بسيط</Text>
          <Text style={styles.message}>
            التطبيق ما توقفش. اضغط إعادة المحاولة ونكملوا من جديد، وتم تسجيل الخلل للإدارة.
          </Text>
          <Pressable onPress={this.retry} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFD21F", alignItems: "center", justifyContent: "center", padding: 22 },
  card: { width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, alignItems: "center" },
  logo: { color: "#FFD21F", backgroundColor: "#111111", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, fontSize: 22, fontWeight: "900", letterSpacing: 2 },
  title: { color: "#111111", fontSize: 22, fontWeight: "900", marginTop: 18, textAlign: "center" },
  message: { color: "#4B5563", fontSize: 14, lineHeight: 22, marginTop: 10, textAlign: "center" },
  button: { backgroundColor: "#111111", borderRadius: 15, minHeight: 52, minWidth: 190, alignItems: "center", justifyContent: "center", marginTop: 22, paddingHorizontal: 20 },
  buttonText: { color: "#FFD21F", fontSize: 15, fontWeight: "900" },
  pressed: { opacity: 0.75 },
});
