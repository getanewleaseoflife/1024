import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { Stepper } from './components/Stepper'
import { AuthProvider, useAuth } from './store/AuthContext'
import { InterviewProvider } from './store/InterviewContext'
import { PositionSelect } from './pages/PositionSelect'
import { ResumeInput } from './pages/ResumeInput'
import { Profile } from './pages/Profile'
import { Interview } from './pages/Interview'
import { Report } from './pages/Report'
import { Dashboard } from './pages/Dashboard'
import { History } from './pages/History'
import { Login } from './pages/Login'
import { Settings } from './pages/Settings'
import { ResumeOptimize } from './pages/ResumeOptimize'
import { Practice } from './pages/Practice'

// 面试五步流程路径：仅在这些路径显示 Stepper 环节门禁
const INTERVIEW_PATHS = ['/position', '/resume', '/profile', '/interview', '/report']

// 路由守卫：未登录一律重定向到 /login
function RequireAuth() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function Layout() {
  const location = useLocation()
  const showStepper = INTERVIEW_PATHS.includes(location.pathname)

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <Header />
      {showStepper && <Stepper />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/resume-optimize" element={<ResumeOptimize />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/position" element={<PositionSelect />} />
          <Route path="/resume" element={<ResumeInput />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/report" element={<Report />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <InterviewProvider>
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      </InterviewProvider>
    </AuthProvider>
  )
}
