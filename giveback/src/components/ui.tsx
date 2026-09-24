// The small set of building blocks every screen is made of.

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, noOutline, radius, space } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';
const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.black, fontSize: 30, lineHeight: 36 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17 },
};

export function Text({
  variant = 'body',
  color = colors.ink,
  weight,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string; weight?: keyof typeof fonts }) {
  return (
    <RNText
      {...rest}
      style={[VARIANTS[variant], { color, writingDirection: 'rtl' }, weight && { fontFamily: fonts[weight] }, style]}
    />
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'waze' | 'light';
const BUTTONS: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.white },
  secondary: { bg: colors.primarySoft, fg: colors.primaryDark },
  ghost: { bg: 'transparent', fg: colors.ink, border: colors.border },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  waze: { bg: colors.waze, fg: colors.wazeInk },
  light: { bg: colors.white, fg: colors.ink, border: colors.border },
};

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  loading,
  disabled,
  size = 'md',
  style,
  testID,
}: {
  title: string;
  onPress?: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const v = BUTTONS[variant];
  const inactive = disabled || loading;
  const height = size === 'lg' ? 54 : size === 'sm' ? 36 : 46;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive }}
      disabled={inactive}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal: size === 'sm' ? space.md : space.lg,
          borderRadius: radius.md,
          backgroundColor: v.bg,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={v.fg} />}
          <Text variant="label" weight="bold" color={v.fg} style={size === 'lg' ? { fontSize: 16 } : undefined}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color = colors.ink,
  badge,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  badge?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}>
      <Ionicons name={icon} size={24} color={color} />
      {!!badge && badge > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 4,
            end: 2,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text variant="caption" weight="bold" color={colors.white} style={{ fontSize: 11, lineHeight: 14 }}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        height: 36,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary : colors.card,
        opacity: pressed ? 0.8 : 1,
      })}>
      {icon && <Ionicons name={icon} size={16} color={selected ? colors.white : colors.muted} />}
      <Text variant="label" color={selected ? colors.white : colors.ink}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  style,
  ...input
}: TextInputProps & { label?: string; hint?: ReactNode; error?: string | null }) {
  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text variant="label" weight="bold">
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={colors.faint}
        {...input}
        style={[
          {
            minHeight: 48,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.card,
            paddingHorizontal: space.md,
            paddingVertical: input.multiline ? space.md : 0,
            fontFamily: fonts.regular,
            fontSize: 15,
            color: colors.ink,
            textAlign: 'right',
            writingDirection: 'rtl',
            textAlignVertical: input.multiline ? 'top' : 'center',
          },
          Platform.OS === 'web' && noOutline,
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : typeof hint === 'string' ? (
        <Text variant="caption" color={colors.muted}>
          {hint}
        </Text>
      ) : (
        hint
      )}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const base: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}>
      {children}
    </Pressable>
  );
}

export function Avatar({ uri, name, size = 40 }: { uri?: string | null; name?: string | null; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  }
  const initial = (name ?? '?').trim().charAt(0);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text weight="bold" color={colors.primaryDark} style={{ fontSize: size * 0.42, lineHeight: size * 0.55 }}>
        {initial}
      </Text>
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'green' | 'yellow' | 'red' | 'coral';
}) {
  const tones = {
    neutral: [colors.border, colors.muted],
    green: [colors.primarySoft, colors.primaryDark],
    yellow: [colors.warningSoft, colors.warning],
    red: [colors.dangerSoft, colors.danger],
    coral: [colors.accentSoft, colors.accent],
  } as const;
  const [bg, fg] = tones[tone];
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}>
      <Text variant="caption" weight="bold" color={fg}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: space.xl, gap: space.md }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={icon} size={34} color={colors.primary} />
      </View>
      <Text variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {body && (
        <Text color={colors.muted} style={{ textAlign: 'center' }}>
          {body}
        </Text>
      )}
      {action}
    </View>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.border,
        borderRadius: radius.md,
        padding: 3,
      }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              height: 36,
              borderRadius: radius.md - 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.card : 'transparent',
            }}>
            <Text variant="label" weight={active ? 'bold' : 'medium'} color={active ? colors.ink : colors.muted}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({
  children,
  style,
  gap = space.sm,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function ListItem({
  icon,
  title,
  subtitle,
  onPress,
  tone = colors.ink,
  right,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  tone?: string;
  right?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: 14,
        paddingHorizontal: space.lg,
        backgroundColor: pressed ? colors.bg : colors.card,
      })}>
      <Ionicons name={icon} size={22} color={tone} />
      <View style={{ flex: 1 }}>
        <Text variant="label" weight="medium" color={tone}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" color={colors.muted}>
            {subtitle}
          </Text>
        )}
      </View>
      {right ?? <Ionicons name="chevron-back" size={18} color={colors.faint} />}
    </Pressable>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
