/** @type {import('tailwindcss').Config} */
// 设计 Token 来源：docs/DESIGN.md §2（语义化配色 / 字体 / 圆角阴影）
// 与 docs/design-prototype.html 中的 token 保持一致。
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0369A1', hover: '#075985', soft: '#E0F2FE' },
        secondary: '#0EA5E9',
        accent: '#16A34A',
        background: '#F0F9FF',
        surface: '#FFFFFF',
        foreground: '#0C4A6E',
        muted: '#E7EFF5',
        'muted-foreground': '#475569',
        border: '#BAE6FD',
        destructive: '#DC2626',
        success: { DEFAULT: '#16A34A', bg: '#DCFCE7' },
        warning: { DEFAULT: '#D97706', bg: '#FEF3C7' },
        danger: { DEFAULT: '#DC2626', bg: '#FEE2E2' },
        neutral: { DEFAULT: '#64748B', bg: '#F1F5F9' },
        persona: { friendly: '#0D9488', rigorous: '#0369A1', stress: '#BE123C' },
      },
      fontFamily: {
        sans: [
          'Open Sans',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'PingFang SC',
          'Microsoft YaHei',
          'Noto Sans SC',
          'sans-serif',
        ],
        display: ['Poppins', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(12,74,110,0.06)',
        panel: '0 4px 16px rgba(12,74,110,0.10)',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
