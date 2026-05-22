import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Key, ShieldCheck, ArrowRight } from 'lucide-react';
import { API_URL } from '../../apiConfig';
import '../../global.css';

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

            localStorage.setItem('user', JSON.stringify({
                ...user,
                organizationSlug: user.organizationSlug,
                trialEndsAt: user.trialEndsAt,
                remainingDays: user.remainingDays
            }));

            if (user.role === 'admin' || user.role === 'tadbirkor') {
                navigate('/admin');
            } else if (user.role === 'kassir') {
                navigate('/');
            } else {
                setError('Noma\'lum rol.');
            }
            
        } catch (err) {
            setError(err.response?.data?.error || "Serverga ulanishda xato yuz berdi");
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
            backgroundColor: 'var(--bg-sub)',
            fontFamily: "'Outfit', sans-serif"
        }}>
            <div className="fade-in" style={{
                background: 'var(--bg-main)',
                padding: '48px',
                borderRadius: '32px',
                width: '440px',
                boxShadow: 'var(--shadow)',
                border: '1px solid var(--border)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{ 
                        display: 'inline-flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        width: '64px', 
                        height: '64px', 
                        backgroundColor: '#6366f1', 
                        borderRadius: '18px', 
                        marginBottom: '20px',
                        boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)' 
                    }}>
                        <ShieldCheck size={32} color="white" />
                    </div>
                    <h2 className="outfit" style={{ margin: 0, fontSize: '2rem', fontWeight: '900', color: 'var(--text-main)' }}>SmartAccess</h2>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)', fontSize: '1rem', fontWeight: '500' }}>Platformaga xavfsiz kirish</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {error && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '14px 20px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '600', border: '1px solid var(--danger)' }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Telefon Raqam</label>
                        <input 
                            type="text" 
                            placeholder="Masalan: 998991234567"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '16px', 
                                borderRadius: '14px', 
                                border: '1px solid var(--border)', 
                                background: 'var(--bg-sub)', 
                                color: 'var(--text-main)', 
                                outline: 'none', 
                                boxSizing: 'border-box',
                                fontWeight: '600',
                                fontSize: '1rem' 
                            }}
                            required
                        />
                    </div>
                    
                    <div>
                        <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Parol</label>
                        <input 
                            type="password" 
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '16px', 
                                borderRadius: '14px', 
                                border: '1px solid var(--border)', 
                                background: 'var(--bg-sub)', 
                                color: 'var(--text-main)', 
                                outline: 'none', 
                                boxSizing: 'border-box',
                                fontWeight: '600',
                                fontSize: '1rem' 
                            }}
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{ 
                            width: '100%', 
                            padding: '18px', 
                            borderRadius: '16px', 
                            border: 'none', 
                            background: '#6366f1', 
                            color: 'white', 
                            fontWeight: '900', 
                            fontSize: '1.1rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '10px',
                            transition: '0.3s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 15px 30px rgba(99, 102, 241, 0.25)'
                        }}
                    >
                        {loading ? 'Kirilmoqda...' : <><Key size={20} /> Tizimga Kirish</>}
                    </button>
                    
                    <div style={{ textAlign: 'center', marginTop: '24px' }}>
                        <a href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            Bosh sahifaga qaytish <ArrowRight size={16} />
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
