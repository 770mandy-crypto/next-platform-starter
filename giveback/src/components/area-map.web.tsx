// Web: Google's keyless embed of the approximate area.
import { createElement } from 'react';
import { View } from 'react-native';

import { radius } from '@/theme';

export function AreaMap({ lat, lng, height = 180 }: { lat: number; lng: number; height?: number }) {
  return (
    <View style={{ height, borderRadius: radius.lg, overflow: 'hidden' }}>
      {createElement('iframe', {
        title: 'אזור האיסוף',
        src: `https://maps.google.com/maps?q=${lat},${lng}&z=14&hl=iw&output=embed`,
        style: { border: 0, width: '100%', height: '100%' },
        loading: 'lazy',
      })}
    </View>
  );
}
