/** @type {import('tailwindcss').Config} */
// 设计 Token 来源：docs/DESIGN.md §2（语义化配色 / 字体 / 圆角阴影）
// 风格方向：「权威中式」——宋体标题 + 黑体正文 + 深墨蓝 + 金琥珀强调。
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1E3A5F', hover: '#16324E', soft: '#E8EEF5' },
        secondary: '#2563EB',
        accent: '#B45309',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        foreground: '#0F172A',
        muted: '#F1F5F9',
        'muted-foreground': '#475569',
        border: '#E4E7EB',
        destructive: '#DC2626',
        success: { DEFAULT: '#059669', bg: '#D1FAE5' },
        warning: { DEFAULT: '#B45309', bg: '#FEF3C7' },
        danger: { DEFAULT: '#DC2626', bg: '#FEE2E2' },
        neutral: { DEFAULT: '#64748B', bg: '#F1F5F9' },
        persona: { friendly: '#0D9488', rigorous: '#0369A1', stress: '#BE123C' },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Noto Sans SC',
          'sans-serif',
        ],
        // 宋体标题栈：「权威中式」辨识度来源（标题/大数字/报告）
        display: ['Noto Serif SC', 'Songti SC', 'SimSun', 'STSong', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.05)',
        panel: '0 4px 16px rgba(15,23,42,0.08)',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
