import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Target, 
  Smartphone, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight, 
  Users, 
  QrCode, 
  Phone, 
  Mail, 
  MapPin,
  X,
  PlayCircle,
  Download,
  Laptop,
  Server,
  Cpu,
  Layers,
  Settings,
  Tv,
  ExternalLink
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import '../global.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('agent'); // For download guide tabs

  return (
    <div className="portfolio-wrapper">
      {/* HEADER */}
      <header style={{ 
        borderBottom: '1px solid var(--border)', 
        padding: '1rem 8%', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: 'var(--glass)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck color="var(--primary)" size={32} />
          <span className="outfit" style={{ fontSize: '1.6rem', fontWeight: 800 }}>SmartAccess</span>
        </div>
        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a href="#about" className="nav-link">Biz haqimizda</a>
          <a href="#programs" className="nav-link">Dasturlarimiz</a>
          <a href="#download" className="nav-link">Yuklab Olish</a>
          <a href="#contact" className="nav-link">Bog'lanish</a>
          <ThemeToggle />
          <button 
            onClick={() => navigate('/login')} 
            className="btn-primary" 
            style={{ fontSize: '0.9rem' }}
          >
            Tizimga Kirish
          </button>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section className="container section-padding fade-in" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '64px',
        paddingTop: '120px'
      }}>
        <div style={{ flex: 1.2 }}>
          <h1 className="outfit" style={{ fontSize: '4.2rem', lineHeight: 1.1, marginBottom: '24px', fontWeight: 900 }}>
            SmartAccess & <span style={{ color: 'var(--primary)' }}>SmartPark</span> <br /> Kelajak IT Yechimlari
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '600px' }}>
            Bizning kompaniyamiz biznes jarayonlarini avtomatlashtirish, kirish-chiqish nazorati tizimlari (SKUD), parkovkalarni boshqarish va zamonaviy xavfsizlik texnologiyalarini joriy etish bilan shug'ullanadi.
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#contact" className="btn-primary outfit">Hamkorlikni Boshlash</a>
            <a href="#programs" className="outfit" style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              textDecoration: 'none', 
              color: 'var(--primary)', 
              fontWeight: 700 
            }}>Dasturlar bilan tanishish <ArrowRight size={18} /></a>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <img 
            src="/office.png" 
            alt="SmartAccess Office" 
            style={{ width: '100%', height: 'auto', borderRadius: '30px', boxShadow: '0 30px 60px rgba(0,0,0,0.1)' }} 
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80";
            }}
          />
        </div>
      </section>

      {/* ABOUT US SECTION */}
      <section id="about" style={{ backgroundColor: 'var(--bg-sub)' }} className="section-padding">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 className="outfit" style={{ fontSize: '2.8rem', fontWeight: 800 }}>Kompaniya Haqida</h2>
            <div style={{ width: '80px', height: '4px', background: 'var(--primary)', margin: '16px auto', borderRadius: '2px' }}></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '48px' }}>
            <div className="card">
              <h3 className="outfit" style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Bizning Missiyamiz</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Biz — innovatsion apparat va dasturiy yechimlarni uyg'unlashtirib, mijozlarimizga xavfsizlik va boshqaruvda maksimal qulaylik taqdim etuvchi jamoamiz. SmartAccess (turniket/QR tizimi) va SmartPark (shlagbaum/ANPR tizimi) kabi mahsulotlarimiz orqali har bir istirohat bog'i, biznes markazi yoki avtoturargohni zamonaviy raqamli boshqaruvga o'tkazamiz.
              </p>
            </div>
            <div className="card">
              <h3 className="outfit" style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Nega aynan biz?</h3>
              <ul style={{ listStyle: 'none', color: 'var(--text-muted)', padding: 0 }}>
                <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 color="var(--primary)" size={18} /> <strong>Hikvision va Dahua integratsiyasi:</strong> Uskunalar bilan to'g'ridan-to'g'ri integratsiya.
                </li>
                <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 color="var(--primary)" size={18} /> <strong>Tezkor Tunnel Tizimi:</strong> Statik IP talab qilmasdan xavfsiz ishlash.
                </li>
                <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 color="var(--primary)" size={18} /> <strong>Telegram Xabarnomalar:</strong> Suratlar va hisobotlar zudlik bilan guruhga yuboriladi.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PROGRAMS / SOFTWARE SECTION */}
      <section id="programs" className="section-padding">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 className="outfit" style={{ fontSize: '2.8rem', fontWeight: 800 }}>Bizning Dasturlarimiz</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Loyiha va biznesingiz uchun mukammal nazorat va avtomatlashtirish tizimlari</p>
          </div>
          
          <div className="programs-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '32px' 
          }}>
            {/* SMARTACCESS QR */}
            <div className="program-card" onClick={() => setActiveProduct('qr')} style={{ cursor: 'pointer', padding: '30px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--bg-card)', transition: 'all 0.3s ease' }}>
              <div className="p-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '20px', borderRadius: '50%', width: 'fit-content', marginBottom: '20px' }}><QrCode size={32} /></div>
              <h3 className="outfit" style={{ fontSize: '1.5rem', marginBottom: '12px' }}>SmartAccess QR</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Bog'lar va dam olish maskanlari uchun turniketlar, QR-kodli chiptalar va kassir/admin nazorat tizimi.</p>
              <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>Batafsil ma'lumot <ArrowRight size={16} /></span>
            </div>

            {/* SMARTPARK SHLAGBAUM */}
            <div className="program-card" onClick={() => setActiveProduct('parking')} style={{ cursor: 'pointer', padding: '30px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--bg-card)', transition: 'all 0.3s ease' }}>
              <div className="p-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', padding: '20px', borderRadius: '50%', width: 'fit-content', marginBottom: '20px' }}><Settings size={32} /></div>
              <h3 className="outfit" style={{ fontSize: '1.5rem', marginBottom: '12px' }}>SmartPark Shlagbaum</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Avtomatlashtirilgan avtoturargoh, ANPR (raqam tanish) kamerasi integratsiyasi va telegram-bot orqali hisobotlar.</p>
              <span style={{ color: '#0ea5e9', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>Batafsil ma'lumot <ArrowRight size={16} /></span>
            </div>

            {/* SMARTSTAFF SKUD */}
            <div className="program-card" onClick={() => setActiveProduct('skud')} style={{ cursor: 'pointer', padding: '30px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--bg-card)', opacity: 0.8 }}>
              <div className="p-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '20px', borderRadius: '50%', width: 'fit-content', marginBottom: '20px' }}><Users size={32} /></div>
              <h3 className="outfit" style={{ fontSize: '1.5rem', marginBottom: '12px' }}>SmartStaff SKUD</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>FaceID kameralar orqali xodimlar davomati, kelib-ketish vaqti va ish soati hisoboti.</p>
              <span style={{ color: '#22c55e', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>Tez kunda...</span>
            </div>

            {/* FINANCE ADMIN */}
            <div className="program-card" onClick={() => setActiveProduct('finance')} style={{ cursor: 'pointer', padding: '30px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--bg-card)', opacity: 0.8 }}>
              <div className="p-icon" style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', padding: '20px', borderRadius: '50%', width: 'fit-content', marginBottom: '20px' }}><BarChart3 size={32} /></div>
              <h3 className="outfit" style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Finance Admin</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Barcha kassa tizimlaridan keladigan tushumlar, xarajatlar va daromadlarni tahlil qilish paneli.</p>
              <span style={{ color: '#f97316', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>Tez kunda...</span>
            </div>
          </div>
        </div>
      </section>

      {/* DOWNLOAD CENTER SECTION (Hikvision Uslubida) */}
      <section id="download" style={{ backgroundColor: 'var(--bg-sub)', padding: '100px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 className="outfit" style={{ fontSize: '2.8rem', fontWeight: 800 }}>Yuklab Olish Markazi</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Tizim ishlashi uchun lokal kompyuterga o'rnatiladigan kerakli agent va qo'shimcha dasturlar</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '48px' }}>
            {/* Dasturlar Ro'yxati */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Card 1: SmartPark Agent */}
              <div className="card" style={{ padding: '28px', display: 'flex', gap: '20px', alignItems: 'flex-start', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px' }}>
                <div style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', padding: '14px', borderRadius: '12px' }}><Server size={28} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 className="outfit" style={{ fontSize: '1.3rem', margin: 0 }}>SmartPark Shlagbaum Agent (v1.0.2)</h3>
                    <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', fontWeight: 700 }}>Tavsiya etiladi</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0 0 16px 0' }}>
                    Hikvision ANPR kameralari va mahalliy shlagbaum boshqaruv platasidan keladigan signallarni cloud server bilan sinxronizatsiya qiluvchi lokal tunnel-agent dasturi.
                  </p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <a href="#setup-guide" onClick={() => setActiveTab('agent')} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.9rem', background: '#0ea5e9' }}>
                      <Download size={16} /> Yuklab Olish (3.2 MB)
                    </a>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tizim: Windows 10/11 x64, Node JS v18+</span>
                  </div>
                </div>
              </div>

              {/* Card 2: SmartAccess Terminal Agent */}
              <div className="card" style={{ padding: '28px', display: 'flex', gap: '20px', alignItems: 'flex-start', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '14px', borderRadius: '12px' }}><Laptop size={28} /></div>
                <div style={{ flex: 1 }}>
                  <h3 className="outfit" style={{ fontSize: '1.3rem', marginBottom: '8px' }}>SmartAccess QR Terminal Client (v1.1.0)</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0 0 16px 0' }}>
                    Bog'larga kirish joyidagi turniket terminallari (Hikvision/Dahua) bilan bog'lanib, shtrix va QR kodlarni onlayn tekshiruvchi va ruxsat beruvchi terminal dasturi.
                  </p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <a href="#setup-guide" onClick={() => setActiveTab('terminal')} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.9rem', background: '#6366f1' }}>
                      <Download size={16} /> Yuklab Olish (4.1 MB)
                    </a>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tizim: Windows 10/11, Port: 8090</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Hikvision iVMS-4200 Lite */}
              <div className="card" style={{ padding: '28px', display: 'flex', gap: '20px', alignItems: 'flex-start', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', opacity: 0.9 }}>
                <div style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#64748b', padding: '14px', borderRadius: '12px' }}><Tv size={28} /></div>
                <div style={{ flex: 1 }}>
                  <h3 className="outfit" style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Hikvision iVMS-4200 Lite (Alarm Client)</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0 0 16px 0' }}>
                    Kamera va turniketlarni dastlabki sozlash, IP manzillarni belgilash va tarmoqdagi Hikvision uskunalarini aniqlash uchun rasmiy Hikvision yordamchi dasturi.
                  </p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <a href="https://www.hikvision.com/en/support/download/software/ivms-4200-series/" target="_blank" rel="noreferrer" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.9rem', border: '1px solid var(--border)' }}>
                      <ExternalLink size={16} /> Hikvision rasmiy saytidan yuklash
                    </a>
                  </div>
                </div>
              </div>

            </div>

            {/* O'rnatish bo'yicha qo'llanma (Setup Guide) */}
            <div id="setup-guide" className="card" style={{ padding: '32px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '24px' }}>
              <h3 className="outfit" style={{ fontSize: '1.6rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={24} color="var(--primary)" /> O'rnatish Qo'llanmasi
              </h3>
              
              {/* Tab headers */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px', gap: '15px' }}>
                <button 
                  onClick={() => setActiveTab('agent')}
                  style={{ 
                    padding: '8px 16px', 
                    background: 'none', 
                    border: 'none', 
                    borderBottom: activeTab === 'agent' ? '2px solid #0ea5e9' : '2px solid transparent',
                    color: activeTab === 'agent' ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  SmartPark Agent
                </button>
                <button 
                  onClick={() => setActiveTab('terminal')}
                  style={{ 
                    padding: '8px 16px', 
                    background: 'none', 
                    border: 'none', 
                    borderBottom: activeTab === 'terminal' ? '2px solid #6366f1' : '2px solid transparent',
                    color: activeTab === 'terminal' ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Terminal Client
                </button>
              </div>

              {/* Tab Content 1: Agent */}
              {activeTab === 'agent' && (
                <div>
                  <ol style={{ paddingLeft: '20px', color: 'var(--text-muted)', lineHeight: '1.7' }}>
                    <li style={{ marginBottom: '12px' }}>
                      <strong style={{ color: 'var(--text-main)' }}>Faylni yuklab oling:</strong> `smartpark-agent.zip` arxivini yuklab oling va uni D:\ diskida (masalan, `D:\TUNEL`) papkaga chiqaring.
                    </li>
                    <li style={{ marginBottom: '12px' }}>
                      <strong style={{ color: 'var(--text-main)' }}>Sozlamalarni tekshiring:</strong> `config.json` yoki `.env` faylida o'zingizning Cloud API URL manzilini hamda local kameralar IP manzillarini kiriting.
                    </li>
                    <li style={{ marginBottom: '12px' }}>
                      <strong style={{ color: 'var(--text-main)' }}>Tizimga ulang:</strong> Terminalni (PowerShell) ochib, `npm install` va keyin `node agent.js` buyrug'ini bering. Dastur CloudFlare Tunnel orqali cloud serverga ulanadi va statik IP-siz ishlay boshlaydi.
                    </li>
                  </ol>
                  <div style={{ marginTop: '20px', padding: '12px 16px', background: 'var(--bg-sub)', borderRadius: '8px', borderLeft: '4px solid #0ea5e9', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    💡 <strong>Maslahat:</strong> Agent dasturi kompyuter o'chib yonganida avtomatik ishga tushishi uchun Windows Task Scheduler-da "Start at startup" rejimini yoqing.
                  </div>
                </div>
              )}

              {/* Tab Content 2: Terminal */}
              {activeTab === 'terminal' && (
                <div>
                  <ol style={{ paddingLeft: '20px', color: 'var(--text-muted)', lineHeight: '1.7' }}>
                    <li style={{ marginBottom: '12px' }}>
                      <strong style={{ color: 'var(--text-main)' }}>Arxivdan chiqaring:</strong> `smartaccess-client.zip` faylini yuklab olib, turniket kompyuteriga o'rnating.
                    </li>
                    <li style={{ marginBottom: '12px' }}>
                      <strong style={{ color: 'var(--text-main)' }}>IP-larni sozlang:</strong> Turniket (Hikvision Terminal) IP manzili va Kassir kompyuteri bir xil lokal tarmoqda (LAN) bo'lishi kerak.
                    </li>
                    <li style={{ marginBottom: '12px' }}>
                      <strong style={{ color: 'var(--text-main)' }}>Integratsiyani faollashtiring:</strong> Dasturni ishga tushiring. Tizim avtomatik ravishda chipta QR kodlarini skanerdan o'tkazadi va turniketga `ISAPI/AccessControl/AcsEvent` so'rovi orqali ruxsat yuboradi.
                    </li>
                  </ol>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* PRODUCT MODAL */}
      {activeProduct && (
        <div className="modal-overlay fade-in" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={() => setActiveProduct(null)}>
          <div className="modal-content scale-up" style={{
            background: 'var(--bg-main)', maxWidth: '800px', width: '100%',
            borderRadius: '32px', overflow: 'hidden', position: 'relative',
            boxShadow: '0 30px 60px rgba(0,0,0,0.2)',
            border: '1px solid var(--border)'
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveProduct(null)} style={{
              position: 'absolute', top: '24px', right: '24px',
              background: 'var(--bg-sub)', border: 'none', padding: '10px',
              borderRadius: '50%', cursor: 'pointer', zIndex: 10,
              color: 'var(--text-main)'
            }}><X size={20} /></button>

            {activeProduct === 'qr' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', padding: '50px 40px', color: 'white' }}>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '16px', color: 'white' }}>SmartAccess QR</h2>
                  <p style={{ fontSize: '1.1rem', opacity: 0.9, margin: 0 }}>Barcha turdagi istirohat bog'lari va ko'ngilochar maskanlar uchun mukammal nazorat tizimi.</p>
                </div>
                <div style={{ padding: '40px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ color: '#6366f1' }}><QrCode size={24} /></div>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Shtrix va QR Kodli Biletlar</h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Har bir mehmon uchun individual va bir martalik xavfsiz QR-kodlar orqali chiptalar sotish tizimi.</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ color: '#6366f1' }}><Smartphone size={24} /></div>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Hikvision integratsiyasi</h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Turniket va terminallar orqali avtomatik tekshirish va kirish ta'minlanadi.</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ color: '#6366f1' }}><BarChart3 size={24} /></div>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Jonli Statistika va Hisobotlar</h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Admin va rahbarlar uchun real vaqt rejimida tushumlar, kassirlar hisoboti va mehmonlar oqimi.</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ color: '#6366f1' }}><ShieldCheck size={24} /></div>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Firibgarlikdan Himoyalangan</h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Biletlardan faqat bir marta foydalanish va muddati o'tgan biletlarni bloklash tizimi.</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button 
                      onClick={() => {
                        setActiveProduct(null);
                        navigate('/login');
                      }}
                      className="btn-primary" 
                      style={{ flex: 1, padding: '20px', borderRadius: '16px', fontSize: '1.1rem', background: '#6366f1' }}
                    >
                      SmartAccess Live Demo paneliga kirish
                    </button>
                    <a 
                      href="#download"
                      onClick={() => setActiveProduct(null)}
                      className="btn-secondary" 
                      style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', border: '1px solid var(--border)' }}
                    >
                      <Download size={20} /> Terminalni yuklash
                    </a>
                  </div>
                </div>
              </div>
            )}

            {activeProduct === 'parking' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', padding: '50px 40px', color: 'white' }}>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '16px', color: 'white' }}>SmartPark Shlagbaum</h2>
                  <p style={{ fontSize: '1.1rem', opacity: 0.9, margin: 0 }}>ANPR (avtomatlashtirilgan raqam tanish) va kameralar integratsiyasiga ega aqlli avtoturargoh tizimi.</p>
                </div>
                <div style={{ padding: '40px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ color: '#0ea5e9' }}><Target size={24} /></div>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>ANPR (Kamera Orqali Raqam Tanish)</h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Hikvision ANPR kameralari yordamida mashina raqamini aniqlash va shlagbaunni avtomatik ochish.</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ color: '#0ea5e9' }}><Tv size={24} /></div>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>RTSP Stream & Snapshot</h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Kirish va chiqishdagi avtomobillarning rasmlarini hamda kameralar jonli videosini (stream) boshqaruv panelida ko'rish.</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ color: '#0ea5e9' }}><BarChart3 size={24} /></div>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Tushum va Seanslar Nazorati</h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Avtomobil qancha vaqt qolgani, belgilangan tarif bo'yicha to'lovlar va kassa tushumlarining to'liq hisoboti.</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ color: '#0ea5e9' }}><Smartphone size={24} /></div>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Telegram va SMS Xabarnomalar</h4>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Avtomat ochilgan shlagbaumlar, kunlik umumiy daromadlar va maxsus hisobotlarni telegram guruhiga rasmi bilan yuborish.</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button 
                      onClick={() => {
                        setActiveProduct(null);
                        // Open demo parking panel
                        window.open('http://localhost:3000', '_blank');
                      }}
                      className="btn-primary" 
                      style={{ flex: 1, padding: '20px', borderRadius: '16px', fontSize: '1.1rem', background: '#0ea5e9' }}
                    >
                      SmartPark Live Demo (Localhost:3000)
                    </button>
                    <a 
                      href="#download"
                      onClick={() => {
                        setActiveProduct(null);
                        setActiveTab('agent');
                      }}
                      className="btn-secondary" 
                      style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', border: '1px solid var(--border)' }}
                    >
                      <Download size={20} /> Shlagbaum Agent yuklash
                    </a>
                  </div>
                </div>
              </div>
            )}

            {(activeProduct === 'skud' || activeProduct === 'finance') && (
              <div style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div style={{ background: 'var(--bg-sub)', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <Smartphone size={48} color="#94a3b8" />
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px' }}>Tez Kunda...</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Ushbu modul hozirda ishlab chiqish jarayonida. SmartAccess platformasining yangi imkoniyatlaridan birinchilar bo'lib foydalanish uchun biz bilan bog'laning.</p>
                <button onClick={() => setActiveProduct(null)} className="btn-primary" style={{ marginTop: '32px', padding: '16px 40px' }}>Yopish</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTACT SECTION */}
      <section id="contact" style={{ backgroundColor: '#0f172a', color: 'white', padding: '100px 0' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '100px', alignItems: 'center' }}>
          <div>
            <h2 className="outfit" style={{ fontSize: '3rem', color: 'white', marginBottom: '24px' }}>Savollar bormi?</h2>
            <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '48px' }}>
              Biz bilan bog'laning va biz sizning loyihangizni birgalikda reallashtiramiz. Biz sizga xavfsiz va avtomatlashtirilgan yechimlarni taqdim etamiz.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Phone color="var(--primary)" />
                <span style={{ fontSize: '1.1rem' }}>+998 91 123 45 67</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Mail color="var(--primary)" />
                <span style={{ fontSize: '1.1rem' }}>info@smartaccess.uz</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <MapPin color="var(--primary)" />
                <span style={{ fontSize: '1.1rem' }}>O'zbekiston, Toshkent sh., Chilonzor tumani</span>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: '40px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="outfit" style={{ marginBottom: '24px', color: 'white' }}>Xabaringizni qoldiring</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <input type="text" placeholder="Ismingiz" style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#1e293b', color: 'white', outline: 'none' }} />
              <input type="email" placeholder="Email manzilingiz" style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#1e293b', color: 'white', outline: 'none' }} />
              <textarea placeholder="Xabaringiz" style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#1e293b', color: 'white', outline: 'none', height: '120px' }}></textarea>
              <button className="btn-primary" style={{ justifyContent: 'center' }}>Xabarni Yuborish</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '40px 0', borderTop: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>© 2026 SmartAccess IT Solutions. Barcha huquqlar himoyalangan.</p>
      </footer>
    </div>
  );
};

export default LandingPage;

