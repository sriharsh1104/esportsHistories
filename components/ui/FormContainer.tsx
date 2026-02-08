import { useResponsive } from '@/context/ResponsiveContext';
import React from 'react';
import { View } from 'react-native';

type FormContainerProps = {
  children: React.ReactNode;
};

export function FormContainer({ children }: FormContainerProps) {
  const { formMaxWidth } = useResponsive();

  if (!formMaxWidth) return <>{children}</>;

  return (
    <View style={{ width: '100%', maxWidth: formMaxWidth, alignSelf: 'center' }}>
      {children}
    </View>
  );
}
