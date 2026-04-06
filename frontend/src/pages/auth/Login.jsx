import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Key } from 'lucide-react';
import { API_URL } from '../../apiConfig';
import '../../adminStyle.css'; // Global dizaynni import qilish

const Login = () => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/auth/login`, { phone, password });
            const user = res.data;

            // Xodim ma'lumotlarini LocalStorage da saqlaymiz
            localStorage.setItem('user', JSON.stringify(user));

            // Lavozimiga qarab burib yuboramiz
            if (user.role === 'admin' || user.role === 'tadbirkor') {
                navigate('/admin');
            } else if (user.role === 'kassir') {
                navigate('/');
            } else {
                setError('Noma\'lum rol.');
            }
            
        } catch (err) {
            setError(err.response?.data?.error || "Serverga ulanishda xato");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh', 
            backgroundColor: 'var(--sidebar-bg)', // To'q ko'k rang
            color: 'white',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                padding: '40px',
                borderRadius: '20px',
                width: '400px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: '50px', height: '50px', backgroundColor: 'var(--primary)', borderRadius: '12px', marginBottom: '15px' }}>
                        <Key size={24} color="white" />
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>XIVA LOKOMOTIV</h2>
                    <p style={{ margin: '5px 0 0 0', color: 'var(--sidebar-text)', fontSize: '0.9rem' }}>Bog'i nazorat tarmog'i</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {error && (
                        <div style={{ background: 'rgba(255, 77, 79, 0.1)', color: 'var(--danger)', padding: '10px 15px', borderRadius: '8px', fontSize: '0.85rem' }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--sidebar-text)' }}>TELEFON RAQAM (Kassir Login)</label>
                        <input 
                            type="text" 
                            placeholder="Masalan: 998991234567"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)', color: 'white', outline: 'none', boxSizing: 'border-box' }}
                            required
                        />
                    </div>
                    
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--sidebar-text)' }}>SHAXSIY PAROL</label>
                        <input 
                            type="password" 
                            placeholder="***"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)', color: 'white', outline: 'none', boxSizing: 'border-box' }}
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{ 
                            width: '100%', 
                            padding: '15px', 
                            borderRadius: '10px', 
                            border: 'none', 
                            background: 'var(--primary)', 
                            color: 'white', 
                            fontWeight: 'bold', 
                            fontSize: '1rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '10px',
                            transition: '0.2s'
                        }}
                    >
                        {loading ? 'Kirilmoqda...' : 'Tizimga Kirish'}
                    </button>
                    
                    {/* Dev helper */}
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '10px' }}>
                         Baza: +998917134713 (Admin) yoki +998907134713 (Kassir)
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
