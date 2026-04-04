import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useResponsive } from "@/context/ResponsiveContext";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useEffect, useState } from "react";
import {
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
} from "react-native";

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  /** Runs on every text change and when `value` / this function updates (for cross-field rules). */
  validateOnChange?: (value: string) => string | undefined;
  leftIcon?: keyof typeof FontAwesome.glyphMap;
  rightIcon?: keyof typeof FontAwesome.glyphMap;
  onRightIconPress?: () => void;
  secure?: boolean;
};

export function Input({
  label,
  error: errorFromParent,
  validateOnChange,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secure = false,
  ...props
}: InputProps) {
  const { onFocus, onBlur, onChangeText, value, ...textInputRest } =
    props as TextInputProps;

  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [internalError, setInternalError] = useState<string | undefined>(
    undefined,
  );
  const scheme = useColorScheme() ?? "light";
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const isPassword = secure;
  const showPassword = isPassword && isPasswordVisible;

  const displayError = errorFromParent || internalError;

  useEffect(() => {
    if (!validateOnChange) {
      setInternalError(undefined);
      return;
    }
    if (value === undefined || value === null) {
      return;
    }
    setInternalError(validateOnChange(String(value)) || undefined);
  }, [value, validateOnChange]);

  const handleChangeText = (text: string) => {
    onChangeText?.(text);
    if (validateOnChange) {
      setInternalError(validateOnChange(text) || undefined);
    }
  };

  return (
    <View style={{ marginBottom: h(16) }}>
      {label && (
        <Text
          style={{
            fontSize: w(14),
            fontWeight: "500",
            marginBottom: h(8),
            color: colors.text,
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1.5,
            borderRadius: w(12),
            minHeight: h(52),
            borderColor: displayError
              ? "#dc3545"
              : isFocused
                ? colors.tint
                : colors.border,
            backgroundColor: colors.inputBg,
          },
        ]}
      >
        {leftIcon && (
          <FontAwesome
            name={leftIcon}
            size={w(18)}
            color={colors.tabIconDefault}
            style={{ position: "absolute", left: w(16), zIndex: 1 }}
          />
        )}
        <TextInput
          {...textInputRest}
          value={value}
          onChangeText={handleChangeText}
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.tabIconDefault}
          style={{
            flex: 1,
            fontSize: w(16),
            paddingVertical: h(14),
            color: colors.text,
            paddingLeft: leftIcon ? w(44) : w(16),
            paddingRight: rightIcon || isPassword ? w(44) : w(16),
          }}
        />
        {isPassword ? (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={{ position: "absolute", right: w(16), padding: w(4) }}
          >
            <FontAwesome
              name={showPassword ? "eye-slash" : "eye"}
              size={w(18)}
              color={colors.tabIconDefault}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={{ position: "absolute", right: w(16), padding: w(4) }}
          >
            <FontAwesome
              name={rightIcon}
              size={w(18)}
              color={colors.tabIconDefault}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {displayError ? (
        <Text style={{ color: "#dc3545", fontSize: w(12), marginTop: h(4) }}>
          {displayError}
        </Text>
      ) : null}
    </View>
  );
}
