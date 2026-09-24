export const colors = {
  bg: '#F6F5F1',
  card: '#FFFFFF',
  ink: '#18201C',
  muted: '#667069',
  faint: '#9AA39D',
  border: '#E6E4DD',
  primary: '#137A4F',
  primaryDark: '#0D5C3B',
  primarySoft: '#E4F3EB',
  accent: '#FF6A45',
  accentSoft: '#FFEDE7',
  warning: '#B7791F',
  warningSoft: '#FDF3DC',
  danger: '#C53030',
  dangerSoft: '#FDE8E8',
  waze: '#33CCFF',
  wazeInk: '#062B3D',
  overlay: 'rgba(12, 20, 16, 0.55)',
  white: '#FFFFFF',
};

export const fonts = {
  regular: 'Heebo_400Regular',
  medium: 'Heebo_500Medium',
  bold: 'Heebo_700Bold',
  black: 'Heebo_800ExtraBold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };

// Browsers draw their own focus ring on inputs; the app's borders already do that job.
export const noOutline = { outlineWidth: 0 } as const;

export const shadow = {
  shadowColor: '#0D1F16',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};
