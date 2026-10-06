import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { CompanionStage } from './progression';

/** Where the top of the head and the eyes sit for each growth stage (120×120 viewBox). */
export function anchors(stage: CompanionStage) {
  if (stage === 0) return { headTop: 24, eyeY: 64, neckY: 92, halfWidth: 28 };
  if (stage === 1) return { headTop: 48, eyeY: 72, neckY: 92, halfWidth: 30 };
  return { headTop: 34, eyeY: 66, neckY: 94, halfWidth: 36 };
}

export function Hat({ item, stage }: { item: string; stage: CompanionStage }) {
  const { headTop: y } = anchors(stage);
  switch (item) {
    case 'partyHat':
      return (
        <G>
          <Path d={`M46 ${y + 6} L60 ${y - 26} L74 ${y + 6} Z`} fill="#FF6482" />
          <Path d={`M50 ${y - 2} L70 ${y - 2} M54 ${y - 12} L66 ${y - 12}`} stroke="#FFD60A" strokeWidth="3.5" strokeLinecap="round" />
          <Circle cx="60" cy={y - 27} r="5" fill="#FFD60A" />
        </G>
      );
    case 'beanie':
      return (
        <G>
          <Path d={`M38 ${y + 8} Q38 ${y - 18} 60 ${y - 18} Q82 ${y - 18} 82 ${y + 8} Z`} fill="#30B0C7" />
          <Rect x="35" y={y + 2} width="50" height="10" rx="5" fill="#0A84FF" />
          <Circle cx="60" cy={y - 20} r="6" fill="#FFFFFF" />
        </G>
      );
    case 'wizardHat':
      return (
        <G>
          <Path d={`M44 ${y + 4} Q56 ${y - 18} 66 ${y - 36} Q68 ${y - 10} 78 ${y + 4} Z`} fill="#5E5CE6" />
          <Ellipse cx="61" cy={y + 5} rx="24" ry="5" fill="#3634A3" />
          <Path d={`M58 ${y - 10} l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5Z`} fill="#FFD60A" />
          <Circle cx="66" cy={y - 2} r="1.8" fill="#FFD60A" />
        </G>
      );
    case 'crown':
      return (
        <G>
          <Path
            d={`M42 ${y + 6} L42 ${y - 12} L51 ${y - 3} L60 ${y - 18} L69 ${y - 3} L78 ${y - 12} L78 ${y + 6} Z`}
            fill="#FFD60A"
            stroke="#FF9F0A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Circle cx="60" cy={y - 1} r="3.5" fill="#FF375F" />
          <Circle cx="49" cy={y + 1} r="2.5" fill="#64D2FF" />
          <Circle cx="71" cy={y + 1} r="2.5" fill="#64D2FF" />
        </G>
      );
    default:
      return null;
  }
}

export function Accessory({ item, stage }: { item: string; stage: CompanionStage }) {
  const { eyeY, neckY, halfWidth } = anchors(stage);
  switch (item) {
    case 'sunglasses':
      return (
        <G>
          <Rect x="37" y={eyeY - 8} width="20" height="14" rx="6" fill="#1C1C1E" />
          <Rect x="63" y={eyeY - 8} width="20" height="14" rx="6" fill="#1C1C1E" />
          <Path d={`M57 ${eyeY - 3} Q60 ${eyeY - 6} 63 ${eyeY - 3}`} stroke="#1C1C1E" strokeWidth="2.5" fill="none" />
          <Path d={`M41 ${eyeY - 5} L47 ${eyeY - 5}`} stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity={0.6} />
        </G>
      );
    case 'bowtie':
      return (
        <G>
          <Path d={`M60 ${neckY} L46 ${neckY - 8} L46 ${neckY + 8} Z M60 ${neckY} L74 ${neckY - 8} L74 ${neckY + 8} Z`} fill="#FF375F" />
          <Circle cx="60" cy={neckY} r="4" fill="#D70015" />
        </G>
      );
    case 'scarf':
      return (
        <G>
          <Path
            d={`M${60 - halfWidth + 4} ${neckY - 6} Q60 ${neckY + 4} ${60 + halfWidth - 4} ${neckY - 6} L${60 + halfWidth - 6} ${neckY + 4} Q60 ${neckY + 14} ${60 - halfWidth + 6} ${neckY + 4} Z`}
            fill="#FF9F0A"
          />
          <Path d={`M70 ${neckY + 4} L74 ${neckY + 20} L66 ${neckY + 21} L64 ${neckY + 6} Z`} fill="#FF7A00" />
        </G>
      );
    default:
      return null;
  }
}
