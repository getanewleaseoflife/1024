export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary text-white grid place-items-center">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.6}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9.3 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.55 12l2.846-.813a4.5 4.5 0 003.09-3.09L9.3 5.25l.513 2.846a4.5 4.5 0 003.09 3.09l2.846.813-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
              />
            </svg>
          </div>
          <div>
            <div className="font-display font-semibold text-[15px] leading-tight">
              岗位胜任力评估智能体
            </div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              AI 面试官 · 模拟面试 + 胜任力评估报告
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-success px-2.5 py-1 rounded-full bg-success-bg">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span> 就绪
          </span>
        </div>
      </div>
    </header>
  )
}
