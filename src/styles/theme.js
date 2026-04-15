// Jarvis AI Theme — Dark futuristic design
export const COLORS = {
  bg: '#050810',
  bgLight: '#0a1128',
  bgCard: 'rgba(0, 20, 40, 0.6)',
  primary: '#00f3ff',
  secondary: '#0077ff',
  accent: '#ff00ff',
  success: '#00ff88',
  danger: '#ff4466',
  warning: '#ffaa00',
  text: '#e0faff',
  textDim: 'rgba(224, 250, 255, 0.5)',
  textMuted: 'rgba(224, 250, 255, 0.3)',
  border: 'rgba(0, 243, 255, 0.2)',
  borderActive: 'rgba(0, 243, 255, 0.5)',
  glow: 'rgba(0, 243, 255, 0.3)',
  overlay: 'rgba(5, 8, 16, 0.95)',
};

export const FONTS = {
  light: {fontWeight: '300'},
  regular: {fontWeight: '400'},
  semibold: {fontWeight: '600'},
  bold: {fontWeight: '700'},
};

export const SHADOWS = {
  glow: {
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
};
