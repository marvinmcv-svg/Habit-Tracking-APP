import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from './theme';
import { type } from './tokens';

type Variant = keyof typeof type;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'inverse';

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  color?: string;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  /** Tabular figures so counters don't jitter as digits change. */
  tabular?: boolean;
}

export function Text({ variant = 'body', tone = 'primary', color, weight, align, tabular, style, ...rest }: AppTextProps) {
  const t = useTheme();
  const toneColor =
    tone === 'secondary'
      ? t.textSecondary
      : tone === 'tertiary'
        ? t.textTertiary
        : tone === 'accent'
          ? t.accent
          : tone === 'inverse'
            ? '#FFFFFF'
            : t.text;
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        type[variant],
        { color: color ?? toneColor },
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
