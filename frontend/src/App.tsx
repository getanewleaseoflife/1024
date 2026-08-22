import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { Stepper } from './components/Stepper'
import { InterviewProvider } from './store/InterviewContext'
import { PositionSelect } from './pages/PositionSelect'
import { ResumeInput } from './pages/ResumeInput'
import { Profile } from './pages/Profile'
import { Interview } from './pages/Interview'
import { Report } from './pages/Report'

export default function App() {
  return (
    <InterviewProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background text-foreground font-sans antialiased">
          <Header />
          <Stepper />
          <Routes>
            <Route path="/" element={<Navigate to="/position" replace />} />
            <Route path="/position" element={<PositionSelect />} />
            <Route path="/resume" element={<ResumeInput />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/interview" element={<Interview />} />
            <Route path="/report" element={<Report />} />
          </Routes>
        </div>
      </BrowserRouter>
    </InterviewProvider>
  )
}
