import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, ArrowLeft, Loader2, CheckCircle2, UserPlus, ArrowRight } from 'lucide-react';
import api from '../../apiConfig';
import '../../global.css';

const Register = () => {
  const [formData, setFormData] = useState({
    orgName: '',
    fullName: '',
    phone: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register', formData);
      setSuccess({
        slug: res.data.slug,
        trialEndsAt: res.data.trialEndsAt
      });
      // Navigatsiya darhol bo'lmaydi, foydalanuvchi linkni ko'rishi kerak
    } catch (err) {
      setError(err.response?.data?.error || 'Ro\'yxatdan o\'tishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const personalLink = `${window.location.origin}/o/${success.slug}`;

    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: "'Outfit', sans-serif", padding: '20px' }}>
        <div className="fade-in" style={{ background: 'white', padding: '60px', borderRadius: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', maxWidth: '600px', width: '100%' }}>
          <div style={{ background: '#f0fdf4', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle2 color="#22c55e" size={48} />
          </div>
          <h2 className="outfit" style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0f172a', marginBottom: '12px' }}>Tabriklaymiz!</h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: 500, marginBottom: '32px' }}>
            Sizning 15 kunlik demo hisobingiz muvaffaqiyatli yaratildi. <br/>
            Ushbu havola orqali tizimga kirishingiz mumkin:
          </p>

          <div style={{ 
            background: '#f1f5f9', 
            padding: '20px', 
            borderRadius: '16px', 
            border: '1px dashed #6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px'
          }}>
            <code style={{ fontSize: '1rem', color: '#6366f1', fontWeight: 700 }}>{personalLink}</code>
            <button 
              onClick={() => { navigator.clipboard.writeText(personalLink); alert("Havola nusxalandi!"); }}
              style={{ background: 'white', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
            >NUSXALASH</button>
          </div>

          <button 
            onClick={() => navigate(`/o/${success.slug}`)}
            className="btn-primary" 
            style={{ width: '100%', padding: '18px', borderRadius: '16px', background: '#6366f1', color: 'white', fontWeight: 900, fontSize: '1.1rem', border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px rgba(99,102, 241, 0.2)' }}
          >
            TIZIMGA KIRISH <ArrowRight size={20} style={{ marginLeft: '10px' }} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'Outfit', sans-serif" }}>
      <div className="fade-in" style={{ maxWidth: '480px', width: '100%', background: 'white', padding: '48px', borderRadius: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '32px', padding: '8px 16px', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem' }}>
          <ArrowLeft size={18} /> Orqaga
        </button>
        
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
          <h2 className="outfit" style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>SmartAccess</h2>
          <p style={{ color: '#64748b', marginTop: '8px', fontWeight: 500 }}>Hamkorlikni boshlash uchun ro'yxatdan o'ting</p>
        </div>

        {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #fee2e2', fontWeight: 600, fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '10px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tashkilot nomi</label>
            <input required type="text" placeholder="Masalan: Korxona nomi" value={formData.orgName} onChange={(e) => setFormData({...formData, orgName: e.target.value})} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '1rem', fontWeight: 600, outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '10px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin F.I.Sh</label>
            <input required type="text" placeholder="Ism sharifingiz" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '1rem', fontWeight: 600, outline: 'none' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '10px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Telefon</label>
              <input required type="text" placeholder="998..." value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '1rem', fontWeight: 600, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '10px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Parol</label>
              <input required type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '1rem', fontWeight: 600, outline: 'none' }} />
            </div>
          </div>
          <button type="submit" disabled={loading} style={{ marginTop: '10px', padding: '18px', borderRadius: '16px', border: 'none', background: '#6366f1', color: '#fff', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 15px 30px rgba(99, 102, 241, 0.25)', transition: '0.3s' }}>
            {loading ? <Loader2 className="animate-spin" /> : <><UserPlus size={20} /> Hamkorlikni boshlash</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
