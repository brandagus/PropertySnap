/** @type {const} */
const themeColors = {
  // Primary Colors
  primary: { light: '#8B2635', dark: '#8B2635' },        // Burgundy - Main CTAs, active states
  primaryDark: { light: '#6D1E2A', dark: '#6D1E2A' },    // Darker burgundy for hover
  
  // Accent
  accent: { light: '#C59849', dark: '#C59849' },         // Ochre Gold - Badges, premium features
  accentDark: { light: '#B88B3D', dark: '#B88B3D' },     // Darker ochre
  accentLight: { light: '#D4A962', dark: '#D4A962' },    // Lighter ochre
  
  // Backgrounds (Light mode only - professional look)
  background: { light: '#FFFFFF', dark: '#FFFFFF' },     // Pure white - Main background
  surface: { light: '#F9F7F4', dark: '#F9F7F4' },        // Cream - Card backgrounds
  surfaceAlt: { light: '#F5F3F0', dark: '#F5F3F0' },     // Soft gray - Input backgrounds
  
  // Text Hierarchy
  foreground: { light: '#1C2839', dark: '#1C2839' },     // Deep Navy - Headers, important text
  text: { light: '#3A3A3A', dark: '#3A3A3A' },           // Charcoal - Body text
  muted: { light: '#6B6B6B', dark: '#6B6B6B' },          // Warm Gray - Secondary text
  placeholder: { light: '#A8A8A8', dark: '#A8A8A8' },    // Mid Gray - Placeholder text
  
  // Borders & Dividers
  border: { light: '#E8E6E3', dark: '#E8E6E3' },         // Light Gray - Borders, dividers
  
  // Status Colors
  success: { light: '#2D5C3F', dark: '#2D5C3F' },        // Forest Green - Success, completed
  warning: { light: '#D97706', dark: '#D97706' },        // Amber - Warnings, needs attention
  error: { light: '#991B1B', dark: '#991B1B' },          // Deep Red - Errors, critical
  info: { light: '#1C2839', dark: '#1C2839' },           // Deep Navy - Info
  
  // Status Backgrounds
  successBg: { light: '#E8F5E9', dark: '#E8F5E9' },      // Light green background
  warningBg: { light: '#FFF3E0', dark: '#FFF3E0' },      // Light amber background
  errorBg: { light: '#FEF2F2', dark: '#FEF2F2' },        // Light red background
};

module.exports = { themeColors };
