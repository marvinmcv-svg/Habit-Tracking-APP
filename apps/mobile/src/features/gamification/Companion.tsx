import { useId } from 'react';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { useHabitStore } from '../habits/store';
import { Accessory, Hat } from './Cosmetics';
import type { CompanionStage } from './progression';
import type { Equipped } from './shop';

interface Props {
  stage: CompanionStage;
  happy: boolean;
  size?: number;
  /** Cosmetics to show; defaults to what the user has equipped. */
  equipped?: Equipped;
}

const breathe = {
  '0%': { transform: [{ scale: 1 }, { translateY: 0 }] },
  '50%': { transform: [{ scale: 1.035 }, { translateY: -2 }] },
  '100%': { transform: [{ scale: 1 }, { translateY: 0 }] },
};

/**
 * Pip, the companion. Grows through five stages as the user levels up and
 * smiles once today's first habit is done. A slow 3.2s idle "breath" makes it
 * feel alive; it's dropped entirely under Reduce Motion.
 */
export function Companion({ stage, happy, size = 120, equipped }: Props) {
  const owned = useHabitStore((s) => s.equipped);
  const { hat, accessory } = equipped ?? owned;
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const body = stage === 0 ? null : stage >= 4 ? ['#C7B8FF', '#7B61FF'] : ['#D8CCFF', '#9A84FF'];
  return (
    <Animated.View
      style={[
        { width: size, height: size },
        !reduced && {
          animationName: breathe,
          animationDuration: '3200ms',
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <RadialGradient id={`body${uid}`} cx="0.4" cy="0.35" r="0.75">
            <Stop offset="0" stopColor={body?.[0] ?? '#FFF8E7'} />
            <Stop offset="1" stopColor={body?.[1] ?? '#F3D9A4'} />
          </RadialGradient>
          <RadialGradient id={`glow${uid}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#B35CFF" stopOpacity={0.28} />
            <Stop offset="1" stopColor="#B35CFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {stage >= 3 && <Circle cx="60" cy="64" r="58" fill={`url(#glow${uid})`} />}
        <Ellipse cx="60" cy="108" rx={stage === 0 ? 24 : 30} ry="5" fill="#000" opacity={0.08} />

        {stage === 0 ? (
          <G>
            <Path d="M60 22c18 0 30 26 30 48a30 30 0 0 1-60 0c0-22 12-48 30-48Z" fill={`url(#body${uid})`} />
            <Circle cx="48" cy="52" r="5" fill="#F0C987" />
            <Circle cx="72" cy="78" r="6" fill="#F0C987" />
            <Circle cx="66" cy="44" r="3" fill="#F0C987" />
            <Path d="M44 66l6 5 6-6 6 6 6-5" stroke="#C99A55" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M52 84q8 5 16 0" stroke="#8A6A3A" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity={happy ? 1 : 0} />
          </G>
        ) : (
          <G>
            {/* Leaf sprout / flower on top */}
            {stage >= 2 && !hat && (
              <G>
                <Path d="M60 34c0-8 0-12 1-16" stroke="#34C759" strokeWidth="3.5" strokeLinecap="round" />
                <Path d="M61 22c6-9 16-9 19-6-3 8-12 11-19 6Z" fill="#30D158" />
                <Path d="M60 24c-6-8-15-8-18-5 3 7 11 10 18 5Z" fill="#34C759" />
              </G>
            )}
            {stage >= 3 && !hat && (
              <G>
                <Circle cx="61" cy="14" r="6" fill="#FF6482" />
                <Circle cx="68" cy="12" r="5" fill="#FF8FA3" />
                <Circle cx="54" cy="12" r="5" fill="#FF8FA3" />
                <Circle cx="61" cy="7" r="5" fill="#FF8FA3" />
                <Circle cx="61" cy="12" r="3.5" fill="#FFD60A" />
              </G>
            )}
            {/* Body */}
            <Path
              d={
                stage === 1
                  ? 'M60 46c20 0 32 16 32 34 0 16-14 24-32 24s-32-8-32-24c0-18 12-34 32-34Z'
                  : 'M60 32c24 0 38 20 38 42 0 20-16 32-38 32s-38-12-38-32c0-22 14-42 38-42Z'
              }
              fill={`url(#body${uid})`}
            />
            {/* Eggshell pants for the hatchling */}
            {stage === 1 && (
              <Path
                d="M28 86l8-6 7 6 8-6 9 6 9-6 8 6 7-6 8 6c0 12-14 20-32 20s-32-8-32-20Z"
                fill="#FFF8E7"
                stroke="#F0D9A8"
                strokeWidth="1.5"
              />
            )}
            {/* Face */}
            <G transform={stage === 1 ? 'translate(0 6)' : undefined}>
              {happy ? (
                <G>
                  <Path d="M42 66q6-7 12 0" stroke="#2B1D5C" strokeWidth="4" fill="none" strokeLinecap="round" />
                  <Path d="M66 66q6-7 12 0" stroke="#2B1D5C" strokeWidth="4" fill="none" strokeLinecap="round" />
                  <Path d="M52 76q8 8 16 0" fill="#2B1D5C" />
                </G>
              ) : (
                <G>
                  <Ellipse cx="48" cy="66" rx="5" ry="6" fill="#2B1D5C" />
                  <Ellipse cx="72" cy="66" rx="5" ry="6" fill="#2B1D5C" />
                  <Circle cx="50" cy="64" r="1.8" fill="#FFF" />
                  <Circle cx="74" cy="64" r="1.8" fill="#FFF" />
                  <Path d="M55 78q5 3 10 0" stroke="#2B1D5C" strokeWidth="3" fill="none" strokeLinecap="round" />
                </G>
              )}
              <Ellipse cx="38" cy="76" rx="6" ry="3.5" fill="#FF8FA3" opacity={0.55} />
              <Ellipse cx="82" cy="76" rx="6" ry="3.5" fill="#FF8FA3" opacity={0.55} />
            </G>
            {stage >= 4 && (
              <G fill="#FFD60A">
                <Path d="M18 36l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
                <Path d="M100 28l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6Z" />
                <Path d="M104 70l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2Z" />
              </G>
            )}
          </G>
        )}
        {accessory ? <Accessory item={accessory} stage={stage} /> : null}
        {hat ? <Hat item={hat} stage={stage} /> : null}
      </Svg>
    </Animated.View>
  );
}
