import { buildAddressMapPickerHtml } from '@/components/addressMapPickerHtml';
import { useMemo } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  visible: boolean;
  initialLatitude: number;
  initialLongitude: number;
  /** Pin chosen — parent runs authenticated reverse geocode (never pass tokens into WebView). */
  onReverseGeocodeRequest: (lat: number, lon: number) => void;
  onCancel: () => void;
};

export function AddressMapPicker({
  visible,
  initialLatitude,
  initialLongitude,
  onReverseGeocodeRequest,
  onCancel,
}: Props) {
  const html = useMemo(
    () => buildAddressMapPickerHtml(initialLatitude, initialLongitude),
    [initialLatitude, initialLongitude]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.fill}>
        <WebView
          style={styles.fill}
          source={{ html }}
          onMessage={(e) => {
            try {
              const d = JSON.parse(e.nativeEvent.data) as {
                type?: string;
                lat?: number;
                lon?: number;
              };
              if (
                d.type === 'REVERSE_GEOCODE' &&
                typeof d.lat === 'number' &&
                typeof d.lon === 'number'
              ) {
                onReverseGeocodeRequest(d.lat, d.lon);
              }
              if (d.type === 'cancel') onCancel();
            } catch {
              /* ignore */
            }
          }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
