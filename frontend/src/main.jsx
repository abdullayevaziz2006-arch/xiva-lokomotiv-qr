import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import KassirPanel from './KassirPanel'

// Admin Layout va Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ProtectedRoute from './pages/auth/ProtectedRoute'

import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Terminals from './pages/admin/Terminals'
import Carousels from './pages/admin/Carousels'
import StaffAttendance from './pages/admin/StaffAttendance'
import Cashiers from './pages/admin/Cashiers'
import Reports from './pages/admin/Reports'
import OrgLogin from './pages/auth/OrgLogin'
import './global.css'

// Theme Initialization
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', savedTheme);

const isKassaDomain = window.location.hostname.includes('kassa');

// Yo'naltirish yordamchisi: Rolga va Domenga qarab kerakli sahifaga yuboradi
const RootRedirect = () => {
  const userString = localStorage.getItem('user');
  if (!userString) return <Navigate to="/login" replace />;
  
  const user = JSON.parse(userString);

  // Agar kassa domenida bo'lsa, to'g'ridan-to'g'ri kassa paneliga
  if (isKassaDomain) {
    return <KassirPanel />;
  }

  // Admin domenida bo'lsa, rolga qarab
  if (user.role === 'admin' || user.role === 'tadbirkor') {
    return <Navigate to="/admin" replace />;
  }
  return <KassirPanel />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Asosiy Landing va Register */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/o/:slug" element={<OrgLogin />} />

        {/* Chipta sotish (Kassir) - Protected */}
        <Route element={<ProtectedRoute allowedRoles={['kassir', 'admin', 'tadbirkor']} />}>
            <Route path="/chipta" element={<KassirPanel />} />
        </Route>
        
        {/* Admin Router */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'tadbirkor']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="terminals" element={<Terminals />} />
            <Route path="carousels" element={<Carousels />} />
            <Route path="cashiers" element={<Cashiers />} />
            <Route path="reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Route>
        
        {/* Noma'lum sahifalar uchun yo'naltirish */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
