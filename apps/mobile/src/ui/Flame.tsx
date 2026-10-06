import { useId } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/** Streak flame. `frozen` renders the icy variant used when a streak freeze covered a day. */
export function Flame({ size = 24, frozen = false, dim = false }: { size?: number; frozen?: boolean; dim?: boolean }) {
  const outer = frozen ? ['#A5E8FF', '#3BA9F5'] : dim ? ['#D1D1D6', '#AEAEB2'] : ['#FFC53D', '#FF5F00'];
  const inner = frozen ? ['#FFFFFF', '#CDEFFF'] : dim ? ['#F2F2F7', '#E5E5EA'] : ['#FFF3B0', '#FFB020'];
  // Gradient ids must be unique per instance: on web, ids are document-global.
  const id = `flame${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id={`${id}-o`} x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor={outer[0]} />
          <Stop offset="1" stopColor={outer[1]} />
        </LinearGradient>
        <LinearGradient id={`${id}-i`} x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor={inner[0]} />
          <Stop offset="1" stopColor={inner[1]} />
        </LinearGradient>
      </Defs>
      <Path
        d="M12.6 1.6c.3 3-1.3 4.6-2.9 6.3C8 9.7 6 11.6 6 15a6 6 0 0 0 12 0c0-2.7-1.2-4.6-2.4-6 .1 1.5-.4 2.6-1.4 3.2.4-3.8-.6-7.7-1.6-10.6Z"
        fill={`url(#${id}-o)`}
      />
      <Path
        d="M12 21a3.3 3.3 0 0 1-3.3-3.3c0-2 1.6-3.2 2.6-4.6.3 1.2 1.1 1.8 1.8 2.2.4-.7.5-1.4.5-2 1 1 1.7 2.4 1.7 4.2A3.3 3.3 0 0 1 12 21Z"
        fill={`url(#${id}-i)`}
      />
    </Svg>
  );
}
