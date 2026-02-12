import { BackButton, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function PrivacyPolicyScreen() {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];

  const styles = useMemo(
    () => ({
      content: { flex: 1, paddingTop: h(48) },
      title: { fontSize: w(24), fontWeight: '700' as const, marginBottom: h(16) },
      subTitle: { fontSize: w(16), fontWeight: '600' as const, marginTop: h(20), marginBottom: h(8) },
      para: { fontSize: w(14), lineHeight: w(22), marginBottom: h(12) },
      list: { marginBottom: h(12), paddingLeft: w(16) },
      listItem: { fontSize: w(14), lineHeight: w(22), marginBottom: h(4) },
      lastUpdate: { fontSize: w(12), color: colors.tabIconDefault, marginBottom: h(24) },
    }),
    [w, h, colors.tabIconDefault]
  );

  return (
    <Screen padded scroll>
      <View style={styles.content}>
        <BackButton />
        <Text style={[styles.title, { color: colors.text }]}>Privacy Policy</Text>
        <Text style={[styles.lastUpdate, { color: colors.tabIconDefault }]}>
          Last updated: February 2025
        </Text>

        <Text style={[styles.para, { color: colors.text }]}>
          Esports Histories ("we", "our", or "us") is committed to protecting your privacy. This
          policy explains how we collect, use, and safeguard your information when you use our
          mobile application for esports news, merchandise purchases, and premium subscriptions.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>1. Information We Collect</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          We collect information you provide directly, including:
        </Text>
        <View style={styles.list}>
          <Text style={[styles.listItem, { color: colors.text }]}>
            • Account details: email, display name, password
          </Text>
          <Text style={[styles.listItem, { color: colors.text }]}>
            • Profile: phone number, address for delivery
          </Text>
          <Text style={[styles.listItem, { color: colors.text }]}>
            • Game preferences: games you follow, tournament interests
          </Text>
          <Text style={[styles.listItem, { color: colors.text }]}>
            • Payment information: processed securely by Stripe (we do not store card details)
          </Text>
          <Text style={[styles.listItem, { color: colors.text }]}>
            • Usage data: app interactions, news preferences
          </Text>
        </View>

        <Text style={[styles.subTitle, { color: colors.text }]}>2. How We Use Your Information</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          We use your data to: deliver personalized esports news; process shop orders (esports org
          merchandise, apparel); manage subscriptions for premium content; improve our services;
          comply with legal obligations; and communicate with you about purchases and updates.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>3. Payment Processing</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          Payments for shop purchases and subscriptions are processed by Stripe. Your payment
          details are handled directly by Stripe and are subject to Stripe's privacy policy. We
          receive only transaction confirmation and necessary billing information. For Google Play
          in-app purchases, payment processing is handled by Google and subject to Google's
          payment terms.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>4. Data Sharing</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          We do not sell your personal data. We may share information with: service providers
          (Stripe, Google) for payment; delivery partners for order fulfillment; and when required
          by law.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>5. Data Security</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          We use industry-standard encryption and security practices. Payment data is never stored
          on our servers. Stripe and Google maintain PCI-DSS compliance for payment processing.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>6. Your Rights</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          You may access, correct, or delete your account data through the app settings. You can
          withdraw consent for marketing communications. For data deletion requests or privacy
          inquiries, contact us at privacy@esportshistories.com.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>7. Children's Privacy</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          Our service is not intended for users under 13. We do not knowingly collect data from
          children. If you believe we have collected such data, contact us immediately.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>8. Changes</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          We may update this policy. Continued use after changes constitutes acceptance. We will
          notify users of material changes via the app or email.
        </Text>

        <Text style={[styles.para, { color: colors.tabIconDefault, marginTop: h(24) }]}>
          Contact: support@esportshistories.com
        </Text>
      </View>
    </Screen>
  );
}
