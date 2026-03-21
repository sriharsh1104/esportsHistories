import { buildAddressMapPickerHtml } from '@/components/addressMapPickerHtml';
import { createElement, useEffect, useMemo, useRef } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

type Props = {
  visible: boolean;
  initialLatitude: number;
  initialLongitude: number;
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

  const onReverseRef = useRef(onReverseGeocodeRequest);
  const onCancelRef = useRef(onCancel);
  onReverseRef.current = onReverseGeocodeRequest;
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!visible) return;
    const handler = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const d = JSON.parse(event.data) as {
          type?: string;
          lat?: number;
          lon?: number;
        };
        if (
          d.type === 'REVERSE_GEOCODE' &&
          typeof d.lat === 'number' &&
          typeof d.lon === 'number'
        ) {
          onReverseRef.current(d.lat, d.lon);
        }
        if (d.type === 'cancel') onCancelRef.current();
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.fill}>
        {visible
          ? createElement('iframe', {
              title: 'Pick delivery location',
              srcDoc: html,
              style: {
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              },
            })
          : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
