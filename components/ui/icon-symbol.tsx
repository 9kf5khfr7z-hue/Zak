// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.down": "keyboard-arrow-down",
  "arrow.left": "arrow-back",
  "house.fill": "home",
  "app.fill": "apps",
  "restaurant": "restaurant",
  "shopping-basket": "shopping-basket",
  "local-pharmacy": "local-pharmacy",
  "smartphone": "smartphone",
  "location.fill": "location-on",
  "bell.fill": "notifications",
  "checkmark.seal.fill": "verified",
  "bicycle": "pedal-bike",
  "magnifyingglass": "search",
  "bag": "shopping-bag",
  "headphones": "headset-mic",
  "chat.bubble.fill": "chat",
  "exclamationmark.bubble.fill": "report-problem",
  "questionmark.circle.fill": "help-outline",
  "person.fill": "person",
  "shield.fill": "security",
} as unknown as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
