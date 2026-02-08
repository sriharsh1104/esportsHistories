import { Dimensions, PixelRatio, Platform, ScaledSize } from 'react-native';

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;
const MAX_CONTENT_WIDTH = 720;
const MAX_FORM_WIDTH = 420;
const MAX_SCALE = 1.4;

export const getDimensions = () => Dimensions.get(Platform.OS === 'web' ? 'window' : 'window');

let _width = getDimensions().width;
let _height = getDimensions().height;

const clampScale = (scale: number) => Math.min(scale, MAX_SCALE);

export const wp = (percent: number, width = _width): number =>
  PixelRatio.roundToNearestPixel((width * percent) / 100);

export const hp = (percent: number, height = _height): number =>
  PixelRatio.roundToNearestPixel((height * percent) / 100);

export const wScale = (size: number, width = _width): number => {
  const scale = clampScale(width / BASE_WIDTH);
  return PixelRatio.roundToNearestPixel(size * scale);
};

export const hScale = (size: number, height = _height): number => {
  const scale = clampScale(height / BASE_HEIGHT);
  return PixelRatio.roundToNearestPixel(size * scale);
};

export const moderateScale = (size: number, factor = 0.5, width = _width): number => {
  const scale = clampScale(width / BASE_WIDTH);
  return size + (size * scale - size) * factor;
};

export const fontScale = (size: number, width = _width): number => {
  const scale = clampScale(width / BASE_WIDTH);
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

export const isSmallDevice = (width = _width): boolean => width < 375;
export const isTablet = (width = _width): boolean => width >= 768;
export const isDesktop = (width = _width): boolean => width >= 1024;

export const getContentMaxWidth = (width = _width): number | undefined =>
  width >= 768 ? MAX_CONTENT_WIDTH : undefined;

export const getFormMaxWidth = (width = _width): number | undefined =>
  width >= 768 ? MAX_FORM_WIDTH : undefined;

export const getScreenDimensions = (): ScaledSize => getDimensions();

export const SCREEN_WIDTH = getDimensions().width;
export const SCREEN_HEIGHT = getDimensions().height;
