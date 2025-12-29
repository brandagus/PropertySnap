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
  // Navigation
  "house.fill": "home",
  "doc.text.fill": "description",
  "archivebox.fill": "archive",
  "person.circle.fill": "account-circle",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "xmark": "close",
  "line.3.horizontal": "menu",
  
  // Actions
  "plus.circle.fill": "add-circle",
  "plus": "add",
  "camera.fill": "camera-alt",
  "photo.fill": "photo",
  "pencil": "edit",
  "trash.fill": "delete",
  "square.and.arrow.up": "share",
  "arrow.down.doc.fill": "file-download",
  
  // Status
  "checkmark.circle.fill": "check-circle",
  "checkmark.shield.fill": "verified-user",
  "exclamationmark.triangle.fill": "warning",
  "xmark.circle.fill": "cancel",
  "bell.fill": "notifications",
  
  // Property
  "building.2.fill": "apartment",
  "key.fill": "vpn-key",
  "briefcase.fill": "work",
  
  // Team Management
  "person.3.fill": "groups",
  "person.badge.plus": "person-add",
  "calendar": "event",
  "checkmark": "check",
  "doc.fill": "description",
  "printer.fill": "print",
  
  // Settings
  "gearshape.fill": "settings",
  "questionmark.circle.fill": "help",
  "info.circle.fill": "info",
  "lock.fill": "lock",
  "envelope.fill": "email",
  "creditcard.fill": "credit-card",
  
  // Misc
  "magnifyingglass": "search",
  "slider.horizontal.3": "tune",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "bolt.fill": "flash-on",
  "bolt.slash.fill": "flash-off",
  "grid": "grid-on",
  "arrow.clockwise": "refresh",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
} as IconMapping;

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
