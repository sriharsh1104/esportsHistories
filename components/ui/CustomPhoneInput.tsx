import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useResponsive } from '@/context/ResponsiveContext';
import parsePhoneNumberFromString from 'libphonenumber-js';
import type { ICountry } from 'react-native-international-phone-number';
import {
  getAllCountries,
  getCountryByCca2,
  getCountryByPhoneNumber,
} from 'react-native-international-phone-number';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const DEFAULT_COUNTRY = 'IN';
const DROPDOWN_MAX_HEIGHT = 220;
const POPULAR_IDS = ['IN', 'US', 'GB', 'AE', 'SA'];

function getNationalNumber(value: string, country: ICountry): string {
  const parsed = parsePhoneNumberFromString(value, country.cca2);
  if (parsed) return parsed.formatNational();
  const root = country.idd?.root?.replace(/\s/g, '') ?? '';
  const prefix = root.replace(/\D/g, '');
  let national = value.replace(root, '').replace(/\D/g, '');
  if (prefix && national.startsWith(prefix)) {
    national = national.length > prefix.length ? national.slice(prefix.length) : '';
  }
  return national;
}

function getCountryName(c: ICountry): string {
  return c.translations?.eng?.common ?? c.name?.common ?? c.cca2 ?? '';
}

function normalizeNationalDigits(value: string): string {
  // Remove leading zero trunk prefix so final number stays E.164 compatible.
  return value.replace(/^0+/, '');
}

type CustomPhoneInputProps = {
  label?: string;
  value?: string;
  onChangeText?: (fullPhone: string) => void;
  placeholder?: string;
  error?: string;
};

export function CustomPhoneInput({
  label,
  value = '',
  onChangeText,
  placeholder = 'Phone number',
  error,
}: CustomPhoneInputProps) {
  const scheme = useColorScheme() ?? 'light';
  const { w, h } = useResponsive();
  const colors = Colors[scheme];
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputLayout, setInputLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const inputContainerRef = useRef<View>(null);

  const [selectedCountry, setSelectedCountry] = useState<ICountry | undefined>(() =>
    getCountryByCca2(DEFAULT_COUNTRY)
  );
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (value) {
      const country = getCountryByPhoneNumber(value);
      if (country) {
        setSelectedCountry(country);
        setInputValue(normalizeNationalDigits(getNationalNumber(value, country)));
      } else {
        const defCountry = getCountryByCca2(DEFAULT_COUNTRY)!;
        setSelectedCountry(defCountry);
        const national = normalizeNationalDigits(getNationalNumber(value, defCountry));
        setInputValue(national);
        if (value.replace(/\D/g, '') && !value.startsWith('+')) {
          const root = defCountry.idd?.root?.replace(/\s/g, '') ?? '';
          onChangeText?.(`${root}${national.replace(/\D/g, '')}`);
        }
      }
    } else {
      setSelectedCountry(getCountryByCca2(DEFAULT_COUNTRY));
      setInputValue('');
    }
  }, [value]);

  const handleInputChange = useCallback(
    (v: string) => {
      const digits = normalizeNationalDigits(v.replace(/\D/g, ''));
      const prefix = selectedCountry?.idd?.root?.replace(/\D/g, '') ?? '';
      let national = digits;
      if (prefix && digits.startsWith(prefix)) {
        national = digits.length > prefix.length ? digits.slice(prefix.length) : '';
      }
      setInputValue(national);
      const root = selectedCountry?.idd?.root?.replace(/\s/g, '') ?? '';
      onChangeText?.(`${root}${national}`);
    },
    [selectedCountry, onChangeText]
  );

  const handleCountrySelect = useCallback(
    (country: ICountry) => {
      setSelectedCountry(country);
      const root = country.idd?.root?.replace(/\s/g, '') ?? '';
      const full = `${root}${inputValue.replace(/\D/g, '')}`;
      onChangeText?.(full);
      setDropdownVisible(false);
      setSearchQuery('');
    },
    [inputValue, onChangeText]
  );

  const measureInput = useCallback((onMeasured?: () => void) => {
    inputContainerRef.current?.measureInWindow((x, y, width, height) => {
      setInputLayout({ x, y, width, height });
      onMeasured?.();
    });
  }, []);

  const filteredCountries = useMemo(() => {
    const all = getAllCountries();
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      const popular = POPULAR_IDS.map((id) => getCountryByCca2(id)).filter(Boolean) as ICountry[];
      const rest = all.filter((c) => !POPULAR_IDS.includes(c.cca2));
      return [...popular, ...rest];
    }
    return all.filter(
      (c) =>
        getCountryName(c).toLowerCase().includes(q) ||
        c.idd?.root?.includes(q) ||
        c.cca2.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const openDropdown = useCallback(() => {
    Keyboard.dismiss();
    measureInput(() => setDropdownVisible(true));
  }, [measureInput]);

  const closeDropdown = useCallback(() => {
    setDropdownVisible(false);
    setSearchQuery('');
  }, []);

  return (
    <View style={{ marginBottom: h(16) }}>
      {label && (
        <Text
          style={{
            fontSize: w(14),
            fontWeight: '500',
            marginBottom: h(8),
            color: colors.text,
          }}
        >
          {label}
        </Text>
      )}
      <View
        ref={inputContainerRef}
        collapsable={false}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          borderRadius: w(12),
          minHeight: h(52),
          borderColor: error ? '#dc3545' : isFocused ? colors.tint : colors.border,
          backgroundColor: colors.inputBg,
        }}
      >
        <TouchableOpacity
          onPress={openDropdown}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: w(12),
            paddingVertical: h(14),
            borderRightWidth: 1,
            borderRightColor: colors.border,
            marginRight: w(8),
          }}
        >
          <Text style={{ fontSize: w(18), marginRight: w(6) }}>
            {selectedCountry?.flag ?? selectedCountry?.cca2}
          </Text>
          <Text
            style={{
              fontSize: w(14),
              fontWeight: '500',
              color: colors.text,
              marginRight: w(4),
            }}
          >
            {selectedCountry?.idd?.root ?? '+91'}
          </Text>
          <Text style={{ fontSize: w(10), color: colors.tabIconDefault }}>▼</Text>
        </TouchableOpacity>
        <TextInput
          value={inputValue}
          onChangeText={handleInputChange}
          placeholder={placeholder}
          placeholderTextColor={colors.tabIconDefault}
          selectionColor={colors.tint}
          keyboardType="number-pad"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            flex: 1,
            fontSize: w(16),
            color: colors.text,
            paddingVertical: h(14),
            paddingHorizontal: w(8),
          }}
        />
      </View>

      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDropdown}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
            onPress={closeDropdown}
          />
          <View
          style={{
            position: 'absolute',
            left: inputLayout.x,
            top:
              inputLayout.y + inputLayout.height + 4 + DROPDOWN_MAX_HEIGHT >
              Dimensions.get('window').height
                ? inputLayout.y - DROPDOWN_MAX_HEIGHT - 4
                : inputLayout.y + inputLayout.height + 4,
            width: inputLayout.width,
            maxHeight: DROPDOWN_MAX_HEIGHT,
            backgroundColor: colors.background,
            borderRadius: w(12),
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <View style={{ paddingHorizontal: w(12), paddingVertical: h(8) }}>
            <TextInput
              placeholder="Search country..."
              placeholderTextColor={colors.tabIconDefault}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                backgroundColor: colors.inputBg,
                borderRadius: w(8),
                paddingHorizontal: w(12),
                paddingVertical: h(10),
                fontSize: w(14),
                color: colors.text,
              }}
            />
          </View>
          <ScrollView
            style={{ maxHeight: DROPDOWN_MAX_HEIGHT - 56 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {filteredCountries.map((c) => (
              <TouchableOpacity
                key={c.cca2}
                onPress={() => handleCountrySelect(c)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: w(12),
                  paddingVertical: h(10),
                  backgroundColor: c.cca2 === selectedCountry?.cca2 ? colors.tint + '20' : 'transparent',
                }}
              >
                <Text style={{ fontSize: w(16), marginRight: w(8) }}>{c.flag ?? c.cca2}</Text>
                <Text
                  style={{
                    fontSize: w(14),
                    fontWeight: '500',
                    color: colors.text,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {getCountryName(c)}
                </Text>
                <Text style={{ fontSize: w(13), color: colors.tabIconDefault }}>
                  {c.idd?.root}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        </View>
      </Modal>

      {error && (
        <Text style={{ color: '#dc3545', fontSize: w(12), marginTop: h(4) }}>{error}</Text>
      )}
    </View>
  );
}
