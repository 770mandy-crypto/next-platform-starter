// The phone map: pins for every nearby item at its approximate point, and a
// list instead when the Android build has no Google Maps key.
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ItemCard } from '@/lib/types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
jest.mock('react-native-maps', () => {
  const { View, Text } = jest.requireActual('react-native');
  const MapView = ({ children, ...p }: { children?: unknown }) => (
    <View testID="map" {...p}>
      {children as never}
    </View>
  );
  const Marker = ({ title, onCalloutPress, coordinate }: never) => (
    <Text testID="pin" onPress={onCalloutPress}>
      {`${title}@${(coordinate as { latitude: number }).latitude}`}
    </Text>
  );
  const Circle = () => <View testID="circle" />;
  return { __esModule: true, default: MapView, Marker, Circle, PROVIDER_GOOGLE: 'google' };
});

let mockMaps = true;
jest.mock('@/lib/maps', () => ({
  get inAppMaps() {
    return mockMaps;
  },
}));

const item = (id: string, title: string, lat: number): ItemCard => ({
  id,
  kind: 'offer',
  title,
  description: '',
  category: 'furniture',
  condition: 'good',
  status: 'available',
  city: 'רמת גן',
  area_label: 'רמת גן',
  photos: [`${id}/p.jpg`],
  created_at: new Date().toISOString(),
  owner_id: 'o',
  owner_name: 'דנה',
  owner_avatar: null,
  community_id: null,
  community_name: null,
  approx_lat: lat,
  approx_lng: 34.82,
  distance_km: 1.2,
});

const items = [item('a', 'שידה', 32.07), item('b', 'ספה', 32.08)];

describe('ItemsMap on phones', () => {
  beforeEach(() => mockPush.mockClear());

  it('puts a pin on the approximate point of every item, opening the item', async () => {
    mockMaps = true;
    const { ItemsMap } = require('../items-map');
    await render(<ItemsMap items={items} center={{ lat: 32.07, lng: 34.82 }} />);
    expect(screen.getAllByTestId('pin')).toHaveLength(2);
    await fireEvent.press(screen.getByText('שידה@32.07'));
    expect(mockPush).toHaveBeenCalledWith('/item/a');
  });

  it('falls back to a nearest-first list without a maps key', async () => {
    mockMaps = false;
    const { ItemsMap } = require('../items-map');
    await render(<ItemsMap items={items} center={{ lat: 32.07, lng: 34.82 }} />);
    expect(screen.queryByTestId('map')).toBeNull();
    await fireEvent.press(screen.getByText('ספה'));
    expect(mockPush).toHaveBeenCalledWith('/item/b');
  });
});

describe('AreaMap on phones', () => {
  it('draws the approximate area, or offers Google Maps without a key', async () => {
    mockMaps = true;
    const { AreaMap } = require('../area-map');
    await render(<AreaMap lat={32.07} lng={34.82} />);
    expect(screen.getByTestId('circle')).toBeTruthy();
    mockMaps = false;
    await render(<AreaMap lat={32.07} lng={34.82} />);
    expect(screen.getByText('הצגת האזור ב-Google Maps')).toBeTruthy();
  });
});
