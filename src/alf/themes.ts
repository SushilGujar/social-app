import {
  createThemes,
  DEFAULT_PALETTE,
  DEFAULT_SUBDUED_PALETTE,
} from '@bsky.app/alf'

const PULSE_PALETTE: typeof DEFAULT_PALETTE = {
  ...DEFAULT_PALETTE,
  primary_25: '#FEF5FF',
  primary_50: '#FDE5FF',
  primary_100: '#FBCCFF',
  primary_200: '#F5A8FF',
  primary_300: '#EE75FF',
  primary_400: '#E542FF',
  primary_500: '#D600FB',
  primary_600: '#B300D6',
  primary_700: '#9100AD',
  primary_800: '#70008A',
  primary_900: '#4F0061',
  primary_950: '#390047',
  primary_975: '#260033',
}

const PULSE_SUBDUED_PALETTE: typeof DEFAULT_SUBDUED_PALETTE = {
  ...DEFAULT_SUBDUED_PALETTE,
  primary_25: '#FEF5FF',
  primary_50: '#FDE8FF',
  primary_100: '#FBD6FF',
  primary_200: '#F5ADFF',
  primary_300: '#EE80FF',
  primary_400: '#E54DFF',
  primary_500: '#D80FFB',
  primary_600: '#B906E0',
  primary_700: '#9A0AB8',
  primary_800: '#7B0E90',
  primary_900: '#5C1264',
  primary_950: '#451249',
  primary_975: '#351236',
}

const PULSE_THEMES = createThemes({
  defaultPalette: PULSE_PALETTE,
  subduedPalette: PULSE_SUBDUED_PALETTE,
})

export const themes = {
  lightPalette: PULSE_THEMES.light.palette,
  darkPalette: PULSE_THEMES.dark.palette,
  dimPalette: PULSE_THEMES.dim.palette,
  light: PULSE_THEMES.light,
  dark: PULSE_THEMES.dark,
  dim: PULSE_THEMES.dim,
}

/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const lightPalette = PULSE_THEMES.light.palette
/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const darkPalette = PULSE_THEMES.dark.palette
/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const dimPalette = PULSE_THEMES.dim.palette
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const light = PULSE_THEMES.light
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const dark = PULSE_THEMES.dark
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const dim = PULSE_THEMES.dim
