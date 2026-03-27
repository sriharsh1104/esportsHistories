import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';

type NoDataFoundProps = {
  title?: string;
  description?: string;
};

export function NoDataFound({
  title = 'No Data Found',
  description = 'No records are available right now. Please try again later.',
}: NoDataFoundProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <Card style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: colors.tint + '14', borderColor: colors.tint + '2E' }]}>
        <FontAwesome name="inbox" size={16} color={colors.tint} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.tabIconDefault }]}>{description}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
