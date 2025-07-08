import React from 'react';
import { View, Text } from 'react-native';

interface CurrencyIconProps {
  category?: string | null;
  size?: number;
  color?: string;
}

// Simple Turkish Lira icon using Text
const TurkishLiraIcon = ({ size = 24, color = '#2563eb' }: { size?: number; color?: string }) => (
  <Text style={{
    fontSize: size,
    color: color,
    fontWeight: 'bold',
  }}>
    ₺
  </Text>
);

export default function CurrencyIcon({ category, size = 24, color = '#2563eb' }: CurrencyIconProps) {
  // Always show Turkish Lira icon since we convert all prices to TRY
  return <TurkishLiraIcon size={size} color={color} />;
}

export const getCurrencySymbol = (category?: string | null) => {
  return '₺'; // Always Turkish Lira since we convert all prices
};

export const convertPrice = (price: number, category?: string | null) => {
  if (category === 'Lazer Hastanesi') {
    return price; // Turkish Lira, no conversion
  }
  return price * 40; // Convert USD to TRY
};

export const formatPrice = (price: number, category?: string | null) => {
  const convertedPrice = convertPrice(price, category);
  return `${convertedPrice.toFixed(2)}`;
};