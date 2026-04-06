import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles }) => {
    const userString = localStorage.getItem('user');

    if (!userString) {
        // Agar tizimga umuman kirmagan bo'lsa login sahifasiga irgitadi
        return <Navigate to="/login" replace />;
    }

    try {
        const user = JSON.parse(userString);
        
        // Agar user.role biz ruxsat bergan ro'yxatda (allowedRoles) bo'lsa, o'tsin (Outlet)
        // Aks holda Login emas, uni kuchi yetadigan qismga burib yuboramiz. 
        if (allowedRoles.includes(user.role)) {
            return <Outlet />;
        } else {
            // Kassir bo'lsa kassir paneliga, boshqa rolda bo'lsa admin paneliga qaytaradi (Xavfsizlik devori)
            return <Navigate to={user.role === 'kassir' ? "/" : "/admin"} replace />;
        }
    } catch (e) {
        localStorage.removeItem('user');
        return <Navigate to="/login" replace />;
    }
};

export default ProtectedRoute;
