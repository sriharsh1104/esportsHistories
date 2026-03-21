import { BackButton, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

const FAQ_ITEMS = [
  {
    q: 'How do I get esports news?',
    a: 'Go to the News tab and follow your favorite games in Settings → Games to follow. News is filtered by the games you follow. You can also follow players in the Tournament tab for player-specific updates.',
  },
  {
    q: 'How does the premium subscription work?',
    a: 'Premium gives you early access to news and exclusive content. Subscribe via the app. Payment is through Google Play or Stripe. Subscriptions auto-renew; cancel anytime in your device or account settings.',
  },
  {
    q: 'How does the Shop work?',
    a: 'The Shop offers esports organization merchandise—jerseys, apparel, accessories. Browse items, add to cart, and checkout. We deliver to your saved addresses. Payment options include Wallet, UPI, card, or cash on delivery.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept: in-app Wallet (top up via UPI/card), UPI, debit/credit cards, and cash on delivery for some orders. Payments are processed securely by Stripe. Google Play billing is used for in-app purchases.',
  },
  {
    q: 'How do I add or change my delivery address?',
    a: 'Go to Profile → Addresses (or from checkout). Add manually, or use GPS / Pick on map to place a pin on an OpenStreetMap view and auto-fill fields. Set a default address for faster checkout.',
  },
  {
    q: 'Can I cancel or refund my order?',
    a: 'Contact support within 7 days for defective or wrong items. Subscription refunds follow Google Play or Stripe policies. Refund requests: support@esportshistories.com.',
  },
  {
    q: 'How do I manage my account?',
    a: 'Settings → Profile for name, phone. Game profiles in Profile → Game Profiles. UPI IDs in Wallet. Change password under Settings. Log out from the same menu. Profile is only accessible from Settings.',
  },
  {
    q: 'What are game profiles?',
    a: 'Game profiles let you add your in-game name and UID for each game you follow. Friends can find you in-game from your profile. Add from Profile → Game Profiles.',
  },
  {
    q: 'How do I follow tournaments?',
    a: 'Go to the Tournament tab. Follow games to see tournament news. Follow players to get updates about them. Manage follows via the "Games to follow" section.',
  },
  {
    q: 'Is my payment information secure?',
    a: 'Yes. We use Stripe for payments—your card details are never stored on our servers. Google Play handles in-app purchases. All transactions are encrypted.',
  },
];

function FAQItem({
  item,
  isOpen,
  onPress,
  colors,
  w,
  h,
}: {
  item: (typeof FAQ_ITEMS)[0];
  isOpen: boolean;
  onPress: () => void;
  colors: ReturnType<typeof Colors>[keyof typeof Colors];
  w: (n: number) => number;
  h: (n: number) => number;
}) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: w(12),
        marginBottom: h(10),
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: w(16),
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: w(15),
            fontWeight: '600',
            color: colors.text,
          }}
        >
          {item.q}
        </Text>
        <Text style={{ fontSize: w(14), color: colors.tint, marginLeft: w(8) }}>
          {isOpen ? '−' : '+'}
        </Text>
      </Pressable>
      {isOpen && (
        <View style={{ paddingHorizontal: w(16), paddingBottom: w(16), paddingTop: 0 }}>
          <Text
            style={{
              fontSize: w(14),
              lineHeight: w(22),
              color: colors.tabIconDefault,
            }}
          >
            {item.a}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function HelpFAQScreen() {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const styles = useMemo(
    () => ({
      content: { flex: 1, paddingTop: h(48) },
      title: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(8) },
      subtitle: { fontSize: w(14), color: colors.tabIconDefault, marginBottom: h(24) },
    }),
    [w, h, colors.tabIconDefault]
  );

  return (
    <Screen padded scroll>
      <View style={styles.content}>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Help & FAQ</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          Tap a question to expand the answer
        </Text>

        {FAQ_ITEMS.map((item, idx) => (
          <FAQItem
            key={idx}
            item={item}
            isOpen={openIndex === idx}
            onPress={() => setOpenIndex(openIndex === idx ? null : idx)}
            colors={colors}
            w={w}
            h={h}
          />
        ))}
      </View>
    </Screen>
  );
}
