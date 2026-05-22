import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { 
  ShoppingBag, 
  Search, 
  History, 
  Moon, 
  Sun, 
  LogOut, 
  QrCode, 
  User, 
  Printer, 
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { API_BASE_URL, API_URL } from './apiConfig';
import ThemeToggle from './components/ThemeToggle';

const socket = io(API_BASE_URL);

const KassirPanel = () => {
    const navigate = useNavigate();
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { organizationName: 'SmartAccess', fullName: 'Kassir' };

    const [basket, setBasket] = useState([]); // [{id, name, price, quantity}]
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState(null);
    const [error, setError] = useState('');

    const [recentTickets, setRecentTickets] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [refundCarousels, setRefundCarousels] = useState([]);

    const [carousels, setCarousels] = useState([]);

    const fetchRecentTickets = async () => {
        setHistoryLoading(true);
        try {
            const res = await axios.get(`${API_URL}/qrcodes/recent?organizationId=${user?.organizationId}`);
            setRecentTickets(res.data);
        } catch (err) {
            console.error("Tarixni yuklashda xato:", err);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        const fetchCarousels = async () => {
            if (!user?.organizationId) {
                console.error("KassirPanel: organizationId topilmadi!", user);
                return;
            }
            try {
                const res = await axios.get(`${API_URL}/carousels?organizationId=${user?.organizationId}`);
                console.log(`[Panel] ${res.data.length} ta o'yingoh yuklandi. (OrgID: ${user.organizationId})`);
                setCarousels(res.data);
            } catch (err) {
                console.error("Karusellarni yuklashda xato:", err);
                setError("O'yingohlarni yuklashda xatolik yuz berdi. Iltimos, sahifani yangilang.");
            }
        };
        fetchCarousels();
        fetchRecentTickets();

        socket.on('qr-used', () => fetchRecentTickets());
        return () => socket.off('qr-used');
    }, []);

    const toggleCarouselSelection = (carousel) => {
        setBasket(prev => {
            const exists = prev.find(item => item.id === carousel.id);
            if (exists) {
                return prev.filter(item => item.id !== carousel.id);
            } else {
                return [...prev, { ...carousel, quantity: 1 }];
            }
        });
    };

    const updateItemQuantity = (id, delta) => {
        setBasket(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const totalPrice = basket.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleGenerate = async () => {
        if (basket.length === 0) {
            setError("Iltimos, xizmat ko'rsatish nuqtasini tanlang!");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/qrcodes/generate`, {
                carousels: basket.map(item => ({ id: item.id, quantity: item.quantity })),
                createdBy: user ? user.id : 1,
                organizationId: user?.organizationId,
                customerName: customerName || "Mehmon",
                customerPhone: customerPhone || "",
                quantity: basket.reduce((sum, i) => sum + i.quantity, 0) // Total for legacy support
            });

            setGeneratedCode({
                ...response.data.qrCode,
                items: basket
            });

            setCustomerName("");
            setCustomerPhone("");
            setBasket([]);
            fetchRecentTickets();

            if (response.status === 207) {
                const detailedErrors = response.data.errors?.join(" | ") || "";
                setError(`Qisman yuklandi. Xatolar: ${detailedErrors}`);
                setGeneratedCode(prev => ({ ...prev, hasErrors: true }));
            } else {
                setError("");
            }
            
            // HAR QANDAY HOLATDA HAM PECHATGA RUXSAT:
            setTimeout(() => window.print(), 350);

        } catch (err) {
            setError(err.response?.data?.error || "Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        setSearchLoading(true);
        setSearchResult(null);
        try {
            const res = await axios.get(`${API_URL}/qrcodes/search?query=${searchQuery}&organizationId=${user?.organizationId}`);
            setSearchResult(res.data);
        } catch (err) {
            alert(err.response?.data?.error || "Topilmadi!");
        } finally {
            setSearchLoading(false);
        }
    };

    const handleRefund = async () => {
        if (refundCarousels.length === 0) {
            alert("Vozvrat uchun o'yingoh tanlang!");
            return;
        }
        try {
            setSearchLoading(true);
            await axios.post(`${API_URL}/qrcodes/refund`, {
                qrId: searchResult.id,
                carouselIds: refundCarousels
            });
            alert("Vozvrat muvaffaqiyatli!");
            setSearchResult(null);
            setSearchQuery('');
            fetchRecentTickets();
        } catch (err) {
            alert(err.response?.data?.error || "Vozvratda xatolik");
        } finally {
            setSearchLoading(false);
        }
    };

    return (
        <div className="kassir-page outfit">
            <div className="container-main">
                
                {/* 3 KUNLIK OGOHLANTIRISH BANNERI */}
                {user.remainingDays <= 3 && !user.trialExpired && (
                    <div className="no-print" style={{
                        background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white',
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        borderRadius: '16px',
                        marginBottom: '16px',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                    }}>
                        <AlertTriangle size={18} />
                        DIQQAT: Demo muddatingiz {user.remainingDays} kundan keyin tugaydi! Tizimni davom ettirish uchun Admin bilan bog'laning.
                    </div>
                )}

                {/* FULL LOCKDOWN OVERLAY */}
                {user.trialExpired && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'var(--bg-main)', opacity: 0.98, backdropFilter: 'blur(10px)',
                        zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-main)'
                    }}>
                        <div className="fade-in" style={{ maxWidth: '500px', padding: '40px' }}>
                            <div style={{ background: 'var(--danger)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Lock size={40} color="white" />
                            </div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '16px' }}>Xizmat to'xtatilgan</h1>
                            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '40px' }}>
                                Sizning tashkilotingiz uchun demo muddati yakunlangan. 
                                Iltimos, xizmatni qayta tiklash uchun ma'muriyatga murojaat qiling.
                            </p>
                            <button className="btn-primary" onClick={() => { localStorage.removeItem('user'); window.location.href = '/login'; }} style={{ background: 'var(--primary)', padding: '18px 40px', fontSize: '1.2rem' }}>CHIQUV</button>
                        </div>
                    </div>
                )}

                {/* HEADER */}
                <header className="kassir-header no-print">
                    <div className="header-logo">
                        <div className="icon"><QrCode size={20} color="white" /></div>
                        <div>
                            <h1 className="brand-name">{user?.organizationName || 'SmartAccess'}</h1>
                            <span className="platform-sub">Terminal Control</span>
                        </div>
                    </div>
                    <div className="header-actions">
                        <ThemeToggle />
                        <div className="user-profile">
                            <span className="user-role">Kassir</span>
                            <span className="user-name">{user?.fullName}</span>
                        </div>
                        <button className="logout-btn" onClick={() => { localStorage.removeItem('user'); navigate('/login'); }}>
                            <LogOut size={18} />
                        </button>
                    </div>
                </header>

                <main className="no-print kassir-main-layout">
                    
                    {/* LEFT: SALES FORM */}
                    <div className="sales-section">
                        <div className="panel-card">
                            <div className="card-header">
                                <ShoppingBag size={20} color="var(--primary)" />
                                <h2>Chipta Sotish</h2>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '12px' }}>
                                <div className="form-group">
                                    <label>Mijoz Ismi:</label>
                                    <input 
                                        type="text" 
                                        placeholder="Mehmon nomi..." 
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="premium-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Telefon (Ixtiyoriy):</label>
                                    <input 
                                        type="text" 
                                        placeholder="998901234567" 
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="premium-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Jami Summa:</label>
                                    <div style={{ padding: '16px', background: 'var(--bg-sub)', borderRadius: '14px', border: '1px solid var(--border)', fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>
                                        {totalPrice.toLocaleString()} UZS
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <label style={{ margin: 0 }}>Xizmat nuqtalarini tanlang:</label>
                                    <button 
                                        className="refresh-btn" 
                                        onClick={() => {
                                            const fetchCarousels = async () => {
                                                try {
                                                    const res = await axios.get(`${API_URL}/carousels?organizationId=${user?.organizationId}`);
                                                    setCarousels(res.data);
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                            };
                                            fetchCarousels();
                                        }}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700 }}
                                    >
                                        <RotateCcw size={12} /> Yangilash
                                    </button>
                                </div>
                                <div className="carousel-grid">
                                    {carousels.length > 0 ? (
                                        carousels.map(c => {
                                            const inBasket = basket.find(item => item.id === c.id);
                                            return (
                                                <button 
                                                    key={c.id}
                                                    className={`carousel-btn ${inBasket ? 'active' : ''}`}
                                                    onClick={() => toggleCarouselSelection(c)}
                                                >
                                                    {inBasket && <CheckCircle2 size={14} className="check-icon" />}
                                                    <span className="c-name">{c.name}</span>
                                                    <span className="c-price">{c.price.toLocaleString()} UZS</span>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div style={{ padding: '20px', textAlign: 'center', width: '100%', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '14px' }}>
                                            Hech qanday o'yingoh topilmadi. Admin panelda qo'shganingizga ishonch hosil qiling.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {basket.length > 0 && (
                                <div className="basket-section">
                                    <h4 style={{ color: 'var(--text-main)', marginBottom: '12px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Tanlangan Xizmatlar:</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {basket.map(item => (
                                            <div key={item.id} className="basket-item">
                                                <div>
                                                    <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{item.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(item.price * item.quantity).toLocaleString()} UZS</div>
                                                </div>
                                                <div className="qty-controls">
                                                    <button className="qty-btn" onClick={() => updateItemQuantity(item.id, -1)}>-</button>
                                                    <span className="qty-val">{item.quantity}</span>
                                                    <button className="qty-btn" onClick={() => updateItemQuantity(item.id, 1)}>+</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button 
                                className="main-sale-btn"
                                onClick={handleGenerate}
                                disabled={loading || basket.length === 0}
                            >
                                {loading ? "Jarayonda..." : <><Printer size={20} /> SOTISH & CHOP ETISH</>}
                            </button>
                            {error && <div className="error-box">{error}</div>}
                        </div>

                        {/* HISTORY SECTION */}
                        <div className="panel-card history-panel">
                            <div className="card-header">
                                <History size={20} color="var(--primary)" />
                                <h2>Oxirgi Sotuvlar</h2>
                                <button className="refresh-btn" onClick={fetchRecentTickets}><RotateCcw size={14} /></button>
                            </div>
                            <div className="history-table-wrapper">
                                <table className="history-table">
                                    <thead>
                                        <tr>
                                            <th>MIJOZ</th>
                                            <th>VAQT</th>
                                            <th>MIQDOR</th>
                                            <th>HOLAT</th>
                                            <th>AMAL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentTickets.map(t => (
                                            <tr key={t.id}>
                                                <td><strong>{t.customerName}</strong></td>
                                                <td>{new Date(t.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</td>
                                                <td style={{ fontWeight: 700 }}>{t.quantity && t.quantity > 1 ? `${t.quantity} ta` : "1 ta"}</td>
                                                <td>
                                                    <span className={`status-pill ${t.status === -1 ? 'refunded' : 'active'}`}>
                                                        {t.status === -1 ? "BEKOR" : "AKTIV"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button className="refund-trigger" onClick={() => { setSearchResult(t); setSearchQuery(t.qrString); }}>Vozvrat</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: SEARCH & REFUND */}
                    <div className="search-section">
                        <div className="panel-card">
                            <div className="card-header">
                                <Search size={20} color="var(--primary)" />
                                <h2>Qidiruv & Vozvrat</h2>
                            </div>
                            
                            <div className="search-bar">
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="QR-Kod kiriting..."
                                    className="premium-input search-input"
                                />
                                <button className="search-btn" onClick={handleSearch}><Search size={20} /></button>
                            </div>

                            {searchResult ? (
                                <div className="result-card fade-in">
                                    <div className="customer-info-box">
                                        <span className="label">MIJOZ</span>
                                        <h3>{searchResult.customerName}</h3>
                                    </div>
                                    <div className="refund-items-list">
                                        {searchResult.carousels.map(rel => (
                                            <div key={rel.id} className="refund-item">
                                                <div className="item-left">
                                                    {rel.status === 0 && (
                                                        <input 
                                                            type="checkbox" 
                                                            checked={refundCarousels.includes(rel.carouselId)} 
                                                            onChange={e => e.target.checked 
                                                                ? setRefundCarousels([...refundCarousels, rel.carouselId]) 
                                                                : setRefundCarousels(refundCarousels.filter(id => id !== rel.carouselId))
                                                            } 
                                                        />
                                                    )}
                                                    <span className="item-name">{rel.carousel?.name}</span>
                                                </div>
                                                <span className={`item-status-pill s-${rel.status}`}>
                                                    {rel.status === 1 ? "O'TILDI" : rel.status === -1 ? "BEKOR" : "KUTILMOQDA"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {searchResult.status !== -1 && (
                                        <button className="refund-confirm-btn" onClick={handleRefund} disabled={refundCarousels.length === 0}>
                                            VOZVRAT QILISH
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="search-placeholder">
                                    <QrCode size={48} color="#f1f5f9" />
                                    <p>Ma'lumotlarni ko'rish uchun QR kodni skanerlang.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* PRINT SECTION (Dinamik Branding bilan) */}
            {generatedCode && (
                <div id="print-section">
                    <div className="ticket-print-box">
                        <h1 className="print-brand">{user?.organizationName || 'SmartAccess'}</h1>
                        <div className="print-divider"></div>
                        <p className="print-customer"><b>{customerName || "Mehmon"}</b></p>
                        <div className="print-qr-wrapper">
                            <QRCodeSVG value={generatedCode.qrString} size={150} level={"H"} />
                            <div style={{ marginTop: '10px', fontSize: '1.2rem', fontWeight: 900 }}>
                                {generatedCode.quantity > 1 ? `[${generatedCode.quantity}] KISHILIK CHIPTA` : "YAGONA CHIPTA"}
                            </div>
                        </div>
                        <ul className="print-services-list">
                            {generatedCode.items?.map((item, i) => (
                                <li key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{item.name}</span>
                                    <span>x{item.quantity}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="print-footer">
                            <p className="qr-text">KOD: {generatedCode.qrString}</p>
                            <p className="time-text">{new Date().toLocaleString()}</p>
                            <p className="note-text">Chipta 24 soat davomida amal qiladi.</p>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
                
                :root {
                    --primary: var(--primary);
                    --bg: var(--bg-sub);
                    --card: var(--bg-main);
                    --text: var(--text-main);
                    --text-muted: var(--text-muted);
                    --border: var(--border);
                    --shadow: var(--shadow);
                }

                .kassir-page {
                    background: var(--bg);
                    color: var(--text);
                    min-height: 100vh;
                    transition: all 0.3s;
                }

                .container-main { max-width: 1440px; margin: 0 auto; padding: 24px; }

                .kassir-header {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 20px 32px; background: var(--card); border-radius: 20px;
                    border: 1px solid var(--border); box-shadow: var(--shadow);
                    margin-bottom: 24px;
                }

                .header-logo { display: flex; align-items: center; gap: 12px; }
                .header-logo .icon { background: var(--primary); padding: 10px; border-radius: 12px; box-shadow: 0 8px 16px rgba(99, 102, 241, 0.2); }
                .brand-name { font-size: 1.25rem; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
                .platform-sub { font-size: 0.7rem; color: var(--primary); font-weight: 800; text-transform: uppercase; }

                .header-actions { display: flex; align-items: center; gap: 24px; }
                .theme-toggle { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px; border-radius: 10px; cursor: pointer; }
                .user-profile { text-align: right; }
                .user-role { display: block; font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
                .user-name { font-weight: 800; font-size: 0.95rem; }
                .logout-btn { background: rgba(239, 68, 68, 0.1); color: var(--danger); border: none; padding: 10px; border-radius: 10px; cursor: pointer; display: flex; transition: 0.2s; }
                .logout-btn:hover { background: var(--danger); color: white; transform: translateY(-2px); }

                .kassir-main-layout { display: grid; grid-template-columns: 1.8fr 1fr; gap: 24px; }
                .panel-card { background: var(--card); border: 1px solid var(--border); border-radius: 24px; padding: 32px; box-shadow: var(--shadow); margin-bottom: 24px; }
                .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
                .card-header h2 { font-size: 1.25rem; font-weight: 900; margin: 0; }

                .form-group { margin-bottom: 24px; }
                .form-group label { display: block; font-size: 0.85rem; font-weight: 800; color: var(--text-muted); margin-bottom: 12px; }
                .premium-input { width: 100%; border-radius: 16px; border: 1px solid var(--border); background: var(--bg); color: var(--text); padding: 16px; font-weight: 600; outline: none; transition: 0.2s; }
                .premium-input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }

                .carousel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
                .carousel-btn { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 16px; border-radius: 18px; font-weight: 700; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; position: relative; }
                .carousel-btn.active { border-color: var(--primary); color: var(--primary); background: rgba(99, 102, 241, 0.05); }
                .carousel-btn .c-name { font-weight: 800; font-size: 1rem; }
                .carousel-btn .c-price { font-size: 0.8rem; color: var(--text-muted); }
                .carousel-btn.active .c-price { color: var(--primary); opacity: 0.8; }
                .check-icon { position: absolute; top: 12px; right: 12px; color: var(--primary); }

                .basket-section { margin-top: 32px; padding-top: 24px; border-top: 2px dashed var(--border); }
                .basket-item { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: var(--bg); border-radius: 16px; border: 1px solid var(--border); margin-bottom: 10px; transition: 0.2s; }
                .basket-item:hover { border-color: var(--primary); transform: translateX(5px); }
                .qty-controls { display: flex; align-items: center; gap: 16px; background: var(--card); padding: 6px; border-radius: 12px; border: 1px solid var(--border); }
                .qty-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--primary); color: white; cursor: pointer; font-weight: 900; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
                .qty-btn:hover { transform: scale(1.1); filter: brightness(1.1); }
                .qty-val { font-weight: 900; font-size: 1.1rem; min-width: 25px; text-align: center; }

                .main-sale-btn { width: 100%; margin-top: 24px; padding: 20px; border-radius: 18px; border: none; background: linear-gradient(135deg, var(--primary) 0%, #4338ca 100%); color: white; font-weight: 900; font-size: 1.1rem; cursor: pointer; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2); display: flex; align-items: center; justify-content: center; gap: 12px; transition: 0.3s; }
                .main-sale-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(99, 102, 241, 0.3); opacity: 0.95; }
                .main-sale-btn:disabled { background: var(--border); color: var(--text-muted); cursor: not-allowed; transform: none; box-shadow: none; }

                .history-table { width: 100%; border-collapse: collapse; }
                .history-table th { text-align: left; padding: 12px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border); }
                .history-table td { padding: 16px 12px; border-bottom: 1px solid var(--border); font-size: 0.9rem; color: var(--text-main); }
                .status-pill { padding: 6px 14px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; }
                .status-pill.active { background: rgba(16, 185, 129, 0.1); color: var(--success); }
                .status-pill.refunded { background: rgba(239, 68, 68, 0.1); color: var(--danger); }
                .refund-trigger { border: 1px solid var(--border); background: var(--bg); color: var(--text-muted); padding: 6px 12px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 0.75rem; transition: 0.2s; }
                .refund-trigger:hover { border-color: var(--danger); color: var(--danger); background: rgba(239, 68, 68, 0.05); }

                .search-bar { display: flex; gap: 12px; margin-bottom: 24px; }
                .search-btn { background: var(--primary); color: white; border: none; border-radius: 14px; padding: 0 20px; cursor: pointer; transition: 0.2s; }
                .search-btn:hover { opacity: 0.9; transform: scale(1.05); }
                .search-placeholder { text-align: center; padding: 60px 0; color: var(--text-muted); }

                .result-card { background: var(--bg); padding: 24px; border-radius: 20px; border: 1px solid var(--border); }
                .customer-info-box h3 { margin: 4px 0 20px 0; font-size: 1.5rem; font-weight: 900; }
                .refund-item { display: flex; justify-content: space-between; align-items: center; padding: 14px; background: var(--card); margin-bottom: 8px; border-radius: 12px; border: 1px solid var(--border); }
                .item-name { font-weight: 700; margin-left: 10px; }
                .item-status-pill { font-size: 0.65rem; font-weight: 900; padding: 4px 8px; border-radius: 6px; }
                .s-1 { background: rgba(16, 185, 129, 0.1); color: var(--success); }
                .s-0 { background: rgba(99, 102, 241, 0.1); color: var(--primary); }
                .s--1 { background: rgba(239, 68, 68, 0.1); color: var(--danger); }
                .refund-confirm-btn { width: 100%; margin-top: 20px; padding: 16px; border: none; background: var(--danger); color: white; font-weight: 900; border-radius: 14px; cursor: pointer; transition: 0.2s; }
                .refund-confirm-btn:hover { opacity: 0.9; transform: translateY(-2px); }
                .refund-confirm-btn:disabled { background: var(--border); color: var(--text-muted); cursor: not-allowed; transform: none; }

                @media print {
                    .no-print { display: none !important; }
                    #print-section { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
                    .ticket-print-box { font-family: 'Courier New', Courier, monospace; width: 300px; padding: 20px; text-align: center; border: 1px dashed #000; }
                    .print-brand { font-size: 20px; margin: 0 0 10px 0; text-transform: uppercase; }
                    .print-divider { border-top: 2px solid #000; margin: 10px 0; }
                    .print-services-list { list-style: none; padding: 0; text-align: left; font-size: 14px; }
                    .print-footer { margin-top: 20px; font-size: 10px; }
                }

                #print-section { display: none; }
            `}</style>
        </div>
    );
};

export default KassirPanel;
