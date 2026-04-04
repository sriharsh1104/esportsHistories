import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useResponsive } from "@/context/ResponsiveContext";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

export type ClassicEmptyStateVariant = "empty" | "error" | "info";

type Props = {
  title: string;
  /** Secondary line — e.g. “Pull to refresh or try another filter.” */
  message?: string;
  variant?: ClassicEmptyStateVariant;
  /** Overrides default icon for the variant. */
  icon?: React.ComponentProps<typeof FontAwesome>["name"];
  style?: ViewStyle;
  /** Optional action row (e.g. retry `Button`). */
  children?: React.ReactNode;
};

const VARIANT_ICON: Record<
  ClassicEmptyStateVariant,
  React.ComponentProps<typeof FontAwesome>["name"]
> = {
  empty: "inbox",
  error: "exclamation-circle",
  info: "info-circle",
};

export function ClassicEmptyState({
  title,
  message,
  variant = "empty",
  icon,
  style,
  children,
}: Props) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { w, h } = useResponsive();

  const iconName = icon ?? VARIANT_ICON[variant];
  const isError = variant === "error";
  const accent = isError ? "#dc2626" : colors.tint;
  const iconBg = isError ? "#dc262614" : colors.tint + "18";
  const iconBorder = isError ? "#dc262633" : colors.tint + "33";

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: colors.border,
          backgroundColor: colors.cardBg ?? colors.background,
          paddingVertical: h(18),
          paddingHorizontal: w(16),
          borderRadius: w(12),
          marginVertical: h(4),
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconRing,
          {
            width: w(44),
            height: w(44),
            borderRadius: w(22),
            backgroundColor: iconBg,
            borderColor: iconBorder,
            marginBottom: h(12),
          },
        ]}
      >
        <FontAwesome name={iconName} size={w(20)} color={accent} />
      </View>
      <Text
        style={[
          styles.title,
          {
            fontSize: w(15),
            color: colors.text,
            marginBottom: message ? h(6) : 0,
          },
        ]}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={[
            styles.message,
            {
              fontSize: w(12),
              color: colors.tabIconDefault,
              lineHeight: w(18),
              maxWidth: w(300),
            },
          ]}
        >
          {message}
        </Text>
      ) : null}
      {children ? (
        <View
          style={{
            marginTop: h(14),
            width: "100%",
            alignItems: "center",
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    borderWidth: 1,
    alignSelf: "stretch",
  },
  iconRing: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: {
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    textAlign: "center",
  },
});
