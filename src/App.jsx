import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Splash from './pages/Splash'
import Register from './pages/Register'
import Login from './pages/Login'
import MemberHome from './pages/MemberHome'
import CoachDashboard from './pages/CoachDashboard'
import WodResult from './pages/WodResult'
import Leaderboard from './pages/Leaderboard'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/member" element={<MemberHome />} />
        <Route path="/coach" element={<CoachDashboard />} />
        <Route path="/log-result" element={<WodResult />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App