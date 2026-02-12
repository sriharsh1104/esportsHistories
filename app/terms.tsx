import { BackButton, Screen } from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function TermsScreen() {
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
        <Text style={[styles.title, { color: colors.text }]}>Terms of Service</Text>
        <Text style={[styles.lastUpdate, { color: colors.tabIconDefault }]}>
          Last updated: February 2025
        </Text>

        <Text style={[styles.para, { color: colors.text }]}>
          Welcome to Esports Histories. By using our app, you agree to these Terms of Service.
          Please read them carefully.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>1. Description of Service</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          Esports Histories provides: (a) esports news and updates tailored to your followed games;
          (b) a shop for esports organization merchandise, apparel, and related products; (c)
          optional premium subscriptions for early access and exclusive news. Content is for
          informational purposes.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>2. Account & Eligibility</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          You must be at least 13 years old to use the app. You are responsible for maintaining
          account security. You must provide accurate information for purchases and deliveries.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>3. Shop & Purchases</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          Shop items include esports team merchandise, apparel, and accessories. Prices are in INR
          and include applicable taxes where shown. Orders are subject to availability. We reserve
          the right to cancel orders for errors or fraud. Delivery times are estimates and not
          guaranteed.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>4. Payments & Refunds</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          Payments are processed via Stripe (cards, UPI) or Google Play billing for in-app
          purchases. All payments are final unless otherwise stated. Refunds: defective or
          incorrect items may be eligible for refund within 7 days of delivery. Subscription
          refunds follow Google Play or Stripe policies. Contact support@esportshistories.com for
          refund requests.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>5. Subscriptions</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          Premium subscriptions grant access to exclusive news and early updates. Subscriptions
          auto-renew unless cancelled before the renewal date. Manage cancellations through your
          device settings (Google Play) or account settings. No refunds for partial subscription
          periods.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>6. User Conduct</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          You agree not to: misuse the app, share false information, harass others, violate
          intellectual property, or use the service for illegal purposes. We may suspend or
          terminate accounts for violations.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>7. Intellectual Property</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          All content, branding, and materials are owned by Esports Histories or our licensors.
          You may not copy, modify, or distribute our content without permission. Esports org
          merchandise designs are licensed from respective organizations.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>8. Limitation of Liability</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          The app is provided "as is." We are not liable for indirect, incidental, or
          consequential damages. Our total liability is limited to the amount you paid for the
          service in the past 12 months. We do not guarantee uninterrupted access or error-free
          operation.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>9. Changes</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          We may modify these terms. Continued use after changes constitutes acceptance. For
          material changes, we will notify you via the app or email.
        </Text>

        <Text style={[styles.subTitle, { color: colors.text }]}>10. Governing Law</Text>
        <Text style={[styles.para, { color: colors.text }]}>
          These terms are governed by the laws of India. Disputes shall be subject to the
          exclusive jurisdiction of courts in India.
        </Text>

        <Text style={[styles.para, { color: colors.tabIconDefault, marginTop: h(24) }]}>
          Contact: support@esportshistories.com
        </Text>
      </View>
    </Screen>
  );
}
