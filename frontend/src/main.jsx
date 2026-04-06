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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Avtorizatsiya Oynasi */}
        <Route path="/login" element={<Login />} />

        {/* Kassirlar uchun (Faqat Kassir yoki Admin kira oladi) */}
        <Route element={<ProtectedRoute allowedRoles={['kassir', 'admin', 'tadbirkor']} />}>
            <Route path="/" element={<KassirPanel />} />
        </Route>
        
        {/* Admin Router (Faqat Admin va Tadbirkor kira oladi) */}
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

      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
