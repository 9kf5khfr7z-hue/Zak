import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  return <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerShown: false, tabBarButton: HapticTab, tabBarStyle: { paddingTop: 8, paddingBottom: bottomPadding, height: 56 + bottomPadding, backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 0.5 } }}>
    <Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} /> }} />
    <Tabs.Screen name="orders" options={{ title: "طلباتي", tabBarIcon: ({ color }) => <IconSymbol size={24} name="bag" color={color} /> }} />
    <Tabs.Screen name="support" options={{ title: "الدعم", tabBarIcon: ({ color }) => <IconSymbol size={24} name="headphones" color={color} /> }} />
    <Tabs.Screen name="profile" options={{ title: "حسابي", tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} /> }} />
  </Tabs>;
}
