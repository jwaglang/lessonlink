// Q46

export interface ThemePreset {
  label: string;
  primary: string;
  secondary: string;
  accent: string;
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  nature:  { label: 'Nature',  primary: '#4CAF50', secondary: '#8BC34A', accent: '#FF9800' },
  ocean:   { label: 'Ocean',   primary: '#0288D1', secondary: '#4FC3F7', accent: '#FFB74D' },
  space:   { label: 'Space',   primary: '#1A237E', secondary: '#7C4DFF', accent: '#FF4081' },
  candy:   { label: 'Candy',   primary: '#E91E63', secondary: '#FF80AB', accent: '#FFC107' },
  warm:    { label: 'Warm',    primary: '#FF5722', secondary: '#FF8A65', accent: '#FDD835' },
  cool:    { label: 'Cool',    primary: '#455A64', secondary: '#90A4AE', accent: '#80DEEA' },
  forest:  { label: 'Forest',  primary: '#2E7D32', secondary: '#66BB6A', accent: '#A1887F' },
  music:   { label: 'Music',   primary: '#6A1B9A', secondary: '#CE93D8', accent: '#FFD54F' },
  city:    { label: 'City',    primary: '#37474F', secondary: '#78909C', accent: '#FFAB40' },
  rainbow: { label: 'Rainbow', primary: '#F44336', secondary: '#2196F3', accent: '#FFEB3B' },
};
