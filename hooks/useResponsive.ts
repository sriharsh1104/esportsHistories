import {
    fontScale,
    hp,
    hScale,
    moderateScale,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
    wp,
    wScale,
} from '@/utils/responsive';
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const scaled = useMemo(
    () => ({
      wp,
      hp,
      w: wScale,
      h: hScale,
      ms: moderateScale,
      fs: fontScale,
    }),
    []
  );

  const isTablet = useMemo(() => width >= 768, [width]);
  const isSmallDevice = useMemo(() => width < 375, [width]);

  return {
    width,
    height,
    ...scaled,
    isTablet,
    isSmallDevice,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
  };
}
