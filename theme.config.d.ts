export const themeColors: {
  primary: { light: string; dark: string };
  primaryDark: { light: string; dark: string };
  accent: { light: string; dark: string };
  accentDark: { light: string; dark: string };
  accentLight: { light: string; dark: string };
  background: { light: string; dark: string };
  surface: { light: string; dark: string };
  surfaceAlt: { light: string; dark: string };
  foreground: { light: string; dark: string };
  text: { light: string; dark: string };
  muted: { light: string; dark: string };
  placeholder: { light: string; dark: string };
  border: { light: string; dark: string };
  success: { light: string; dark: string };
  warning: { light: string; dark: string };
  error: { light: string; dark: string };
  info: { light: string; dark: string };
  successBg: { light: string; dark: string };
  warningBg: { light: string; dark: string };
  errorBg: { light: string; dark: string };
};

declare const themeConfig: {
  themeColors: typeof themeColors;
};

export default themeConfig;
