import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Key, ShieldCheck, Loader2 } from 'lucide-react';
import { API_URL } from '../../apiConfig';
import '../../global.css';

const OrgLogin = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [org, setOrg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchOrg = async () => {
            try {
                const res = await axios.get(`${API_URL}/orgs/by-slug/${slug}`);
                setOrg(res.data);
            } catch (err) {
                setError("Bunday havola mavjud emas.");
            } finally {
                setLoading(false);
            }
        };
        fetchOrg();
    }, [slug]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoginLoading(true);

        try {
            const res = await axios.post(`${API_URL}/auth/login`, { phone, password });
            const user = res.data;

            // Xavfsizlik: Faqat shu org foydalanuvchisi kira olishi kerak (Ixtiyoriy, lekin yaxshi)
            if (user.organizationId !== org.id) {
                setError("Siz boshqa tashkilotga a'zosiz.");
                setLoginLoading(false);
                return;
            }

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
            }
        } catch (err) {
            setError(err.response?.data?.error || "Login yoki parol xato");
        } finally {
            setLoginLoading(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <Loader2 className="animate-spin" color="#6366f1" size={48} />
        </div>
    );

    if (error && !org) return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', textAlign: 'center' }}>
            <h1 style={{ fontSize: '4rem', fontWeight: 900, color: '#e2e8f0' }}>404</h1>
            <p style={{ color: '#64748b', fontSize: '1.2rem', marginBottom: '24px' }}>Tashkilot topilmadi.</p>
            <button onClick={() => navigate('/')} className="btn-primary" style={{ padding: '12px 24px' }}>Bosh sahifaga qaytish</button>
        </div>
    );

    return (
        <div style={{
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh', 
            backgroundColor: '#f1f5f9',
            fontFamily: "'Outfit', sans-serif"
        }}>
            <div className="fade-in" style={{
                background: 'white',
                padding: '48px',
                borderRadius: '32px',
                width: '440px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0',
                position: 'relative'
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
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>SmartAccess Platform</div>
                    <h2 className="outfit" style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', color: '#0f172a' }}>{org.name}</h2>
                    <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '0.95rem', fontWeight: '500' }}>Tizimga xavfsiz kirish</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '14px 20px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '600', border: '1px solid #fee2e2' }}>{error}</div>}

                    <div>
                        <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>Login (Telefon)</label>
                        <input 
                            type="text" 
                            placeholder="998..."
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontWeight: '600' }}
                            required
                        />
                    </div>
                    
                    <div>
                        <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.8rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>Maxfiy Parol</label>
                        <input 
                            type="password" 
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontWeight: '600' }}
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loginLoading}
                        style={{ 
                            width: '100%', 
                            padding: '18px', 
                            borderRadius: '16px', 
                            border: 'none', 
                            background: '#6366f1', 
                            color: 'white', 
                            fontWeight: '900', 
                            fontSize: '1.1rem',
                            cursor: loginLoading ? 'not-allowed' : 'pointer',
                            marginTop: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 15px 30px rgba(99, 102, 241, 0.2)'
                        }}
                    >
                        {loginLoading ? <Loader2 className="animate-spin" size={20} /> : <><Key size={20} /> Kirish</>}
                    </button>
                    
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Demo muddati: {new Date(org.trialEndsAt).toLocaleDateString()}</p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OrgLogin;
