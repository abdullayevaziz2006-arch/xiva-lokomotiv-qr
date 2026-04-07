import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import KassirPanel from './KassirPanel'

// Admin Layout va Pages
import Login from './pages/auth/Login'
import ProtectedRoute from './pages/auth/ProtectedRoute'

import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Terminals from './pages/admin/Terminals'
import Carousels from './pages/admin/Carousels'
import Cashiers from './pages/admin/Cashiers'
import Reports from './pages/admin/Reports'

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
        {/* Avtorizatsiya Oynasi */}
        <Route path="/login" element={<Login />} />

        {/* Asosiy Yo'naltirish */}
        <Route element={<ProtectedRoute allowedRoles={['kassir', 'admin', 'tadbirkor']} />}>
            <Route path="/" element={<RootRedirect />} />
            
            {/* Chipta sotish faqat kassa domenida ishlaydi */}
            {isKassaDomain && <Route path="/chipta" element={<KassirPanel />} />}
        </Route>
        
        {/* Admin Router (Kassa domenida yopib qo'yiladi) */}
        {!isKassaDomain && (
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
        )}

        {/* Agar kassa domenida admin yoki boshqa yo'llarga kirsa, orqaga qaytarish */}
        {isKassaDomain && (
          <>
            <Route path="/admin/*" element={<Navigate to="/" replace />} />
            <Route path="/chipta/*" element={<Navigate to="/chipta" replace />} />
          </>
        )}
        
        {/* Noma'lum sahifalar uchun yo'naltirish */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
