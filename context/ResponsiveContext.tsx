import {
    fontScale,
    getContentMaxWidth,
    getFormMaxWidth,
    hp,
    hScale,
    isDesktop,
    isSmallDevice,
    isTablet,
    moderateScale,
    wp,
    wScale,
} from '@/utils/responsive';
import React, { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';

type ResponsiveContextType = {
  width: number;
  height: number;
  wp: (p: number) => number;
  hp: (p: number) => number;
  w: (s: number) => number;
  h: (s: number) => number;
  ms: (s: number, f?: number) => number;
  fs: (s: number) => number;
  isTablet: boolean;
  isSmallDevice: boolean;
  isDesktop: boolean;
  contentMaxWidth: number | undefined;
  formMaxWidth: number | undefined;
};

const ResponsiveContext = createContext<ResponsiveContextType | null>(null);

export function ResponsiveProvider({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();

  const value: ResponsiveContextType = {
    width,
    height,
    wp: (p) => wp(p, width),
    hp: (p) => hp(p, height),
    w: (s) => wScale(s, width),
    h: (s) => hScale(s, height),
    ms: (s, f) => moderateScale(s, f ?? 0.5, width),
    fs: (s) => fontScale(s, width),
    isTablet: isTablet(width),
    isSmallDevice: isSmallDevice(width),
    isDesktop: isDesktop(width),
    contentMaxWidth: getContentMaxWidth(width),
    formMaxWidth: getFormMaxWidth(width),
  };

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsive() {
  const ctx = useContext(ResponsiveContext);
  if (!ctx) throw new Error('useResponsive must be used within ResponsiveProvider');
  return ctx;
}
