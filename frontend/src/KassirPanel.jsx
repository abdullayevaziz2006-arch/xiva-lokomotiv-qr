import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_BASE_URL, API_URL } from './apiConfig';

const socket = io(API_BASE_URL);


const KassirPanel = () => {
    const navigate = useNavigate();
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    // Generatsiya statelari
    const [selectedCarousels, setSelectedCarousels] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState(null);
    const [error, setError] = useState('');

    // Vozvrat statelari
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [refundCarousels, setRefundCarousels] = useState([]);

    const [carousels, setCarousels] = useState([]);

    useEffect(() => {
        const fetchCarousels = async () => {
            try {
                const res = await axios.get(`${API_URL}/carousels`);
                setCarousels(res.data);
            } catch (err) {
                console.error("Karusellarni yuklashda xato:", err);
            }
        };
        fetchCarousels();

        // Socket.io orqali real-vaqtda xabarlarni eshitish
        socket.on('qr-used', (data) => {
            console.log('[Socket] QR ishlatildi:', data);

            // Agar hozir ekranda turgan chipta bo'lsa, uning holatini yangilaymiz
            setSearchResult(prev => {
                if (!prev) return null;
                if (prev.id === data.qrCodeId) {
                    const newCarousels = prev.carousels.map(rel => {
                        if (rel.carouselId === data.carouselId) {
                            return { ...rel, status: 1 }; // Ishlatildi deb belgilash
                        }
                        return rel;
                    });
                    return { ...prev, carousels: newCarousels };
                }
                return prev;
            });
        });

        return () => {
            socket.off('qr-used');
        };
    }, []);

    const toggleCarouselSelection = (id) => {
        if (selectedCarousels.includes(id)) {
            setSelectedCarousels(selectedCarousels.filter(item => item !== id));
        } else {
            setSelectedCarousels([...selectedCarousels, id]);
        }
    };

    const handleGenerate = async () => {
        if (selectedCarousels.length === 0) {
            setError("Iltimos, kamida bitta karuselni tanlang!");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/qrcodes/generate`, {
                carousels: selectedCarousels,
                createdBy: user ? user.id : 1, // Kassir ID (Storage dan olindi)
                customerName: customerName || "Mijoz",
                customerPhone: customerPhone || ""
            });

            setGeneratedCode({
                ...response.data.qrCode,
                selectedNames: carousels.filter(c => selectedCarousels.includes(c.id)).map(c => c.name)
            });

            // Chipta sotildi. Formani tozalab yana xarid qilinishini oldini olamiz:
            setCustomerName("");
            setCustomerPhone("");
            setSelectedCarousels([]);

            // Xatoliklar qisman bo'lsa (207)
            if (response.status === 207) {
                setError(response.data.message + " Ulanmagan uskunalar: " + JSON.stringify(response.data.errors));
                setGeneratedCode(prev => ({ ...prev, hasErrors: true }));
            } else {
                setError(""); // Muaffaqqiyatli ishladi
            }

            // Xato bo'lsa darhol chop etmaymiz (qayta yuklab olgunicha)
            if (response.status !== 207) {
                setTimeout(() => {
                    window.print();
                }, 100);
            }

        } catch (err) {
            setError(err.response?.data?.error || "Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async () => {
        try {
            setLoading(true);
            const res = await axios.post(`${API_URL}/qrcodes/${generatedCode.id}/retry`);
            if (res.status === 200) {
                alert("Terminalga qabul qilindi!");
                setError("");
                setGeneratedCode(prev => ({ ...prev, hasErrors: false }));
                setTimeout(() => window.print(), 500);
            } else {
                alert(res.data.message);
            }
        } catch (e) {
            alert("Qayta yuklashda baribir xatolik: " + (e.response?.data?.error || e.message));
        } finally {
            setLoading(false);
        }
    };

    const handleNewTicket = () => {
        setGeneratedCode(null);
        setError("");
    };

    // --- VOZVRAT FUNKSIYALARI ---
    const handleSearch = async () => {
        if (!searchQuery) return;
        setSearchLoading(true);
        setSearchResult(null);
        setRefundCarousels([]);
        try {
            const res = await axios.get(`${API_URL}/qrcodes/search?query=${searchQuery}`);
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
            const res = await axios.post(`${API_URL}/qrcodes/refund`, {
                qrId: searchResult.id,
                carouselIds: refundCarousels
            });
            alert("Muvaffaqiyatli! " + res.data.message);
            handleSearch(); // Izlashni yangilash
        } catch (err) {
            alert(err.response?.data?.error || "Vozvratda xatolik");
        } finally {
            setSearchLoading(false);
        }
    };

    return (
        <div className="kassir-container" style={{
            padding: 'clamp(12px, 4vw, 40px)',
            fontFamily: "'Inter', sans-serif",
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            minHeight: '100vh',
            display: 'flex',
            gap: 'clamp(14px, 3vw, 30px)',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'flex-start'
        }}>

            {/* GENERATSIYA QISMI (CHIPTA SOTISH) */}
            <div className="no-print glass-card" style={{
                flex: '1',
                minWidth: 'min(100%, 400px)',
                maxWidth: '500px',
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                padding: 'clamp(16px, 4vw, 30px)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.18)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: '#1a1a1a' }}>Chipta Sotish</h2>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.8rem', color: '#666', display: 'block' }}>Kassir:</span>
                        <b style={{ color: '#2f54ff' }}>{user ? user.fullName : 'Noma\'lum'}</b>
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#555' }}>Mijozning ismi:</label>
                    <input
                        type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                        style={{
                            padding: '12px 16px',
                            marginTop: '8px',
                            width: '100%',
                            boxSizing: 'border-box',
                            borderRadius: '12px',
                            border: '2px solid #eee',
                            fontSize: '1rem',
                            transition: 'all 0.3s'
                        }}
                        placeholder="Masalan: Jamshid Qadamboyev"
                    />
                </div>

                <div style={{ marginBottom: '25px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#555' }}>Karusellar:</label>
                    <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                        {carousels.map(c => (
                            <div key={c.id}
                                onClick={() => toggleCarouselSelection(c.id)}
                                style={{
                                    padding: '12px',
                                    background: selectedCarousels.includes(c.id) ? '#2f54ff' : '#fff',
                                    color: selectedCarousels.includes(c.id) ? '#fff' : '#333',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: selectedCarousels.includes(c.id) ? '0 4px 12px rgba(47, 84, 255, 0.3)' : '0 2px 4px rgba(0,0,0,0.05)',
                                    border: '1px solid ' + (selectedCarousels.includes(c.id) ? '#2f54ff' : '#eee')
                                }}>
                                <div style={{
                                    width: '18px', height: '18px', border: '2px solid ' + (selectedCarousels.includes(c.id) ? '#fff' : '#ddd'),
                                    borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px'
                                }}>
                                    {selectedCarousels.includes(c.id) && '✓'}
                                </div>
                                <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{c.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {!generatedCode || !generatedCode.hasErrors ? (
                    <button
                        onClick={handleGenerate}
                        disabled={loading || selectedCarousels.length === 0}
                        style={{
                            padding: '16px',
                            backgroundColor: '#2f54ff',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            width: '100%',
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            borderRadius: '16px',
                            boxShadow: '0 10px 20px -5px rgba(47, 84, 255, 0.4)',
                            transition: 'all 0.3s'
                        }}
                    >
                        {loading ? "Tayyorlanmoqda..." : "Sotish & Chop etish"}
                    </button>
                ) : (
                    <div style={{ padding: '20px', background: '#fff9db', borderRadius: '16px', border: '1px solid #fcc419' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#856404', fontSize: '0.95rem' }}>
                            ⚠️ Terminal ulanishida xatolik!
                        </h4>
                        <button onClick={handleRetry} style={{ padding: '12px', background: '#fcc419', color: '#000', border: 'none', cursor: 'pointer', fontWeight: '800', borderRadius: '10px', width: '100%', marginBottom: '10px' }}>
                            QAYTA YUBORISH ♻️
                        </button>
                        <button onClick={handleNewTicket} style={{ background: 'none', border: 'none', color: '#666', width: '100%', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
                            Bekor qilish
                        </button>
                    </div>
                )}
                {error && <p style={{ color: '#ff4d4f', marginTop: '15px', fontSize: '0.85rem', textAlign: 'center', fontWeight: '600' }}>{error}</p>}
            </div>

            {/* VOZVRAT QISMI (IZLASH & QAYTARISH) */}
            <div className="no-print glass-card" style={{
                flex: '1.2',
                minWidth: 'min(100%, 400px)',
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                padding: 'clamp(16px, 4vw, 30px)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.18)'
            }}>
                <h2 style={{ margin: '0 0 25px 0', fontSize: '1.8rem', fontWeight: '800', color: '#1a1a1a' }}>Chiptani Izlash & Vozvrat</h2>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                                padding: '14px 20px',
                                width: '100%',
                                boxSizing: 'border-box',
                                borderRadius: '14px',
                                border: '2px solid #2f54ff44',
                                fontSize: '1rem',
                                outline: 'none',
                                focus: { border: '2px solid #2f54ff' }
                            }}
                            placeholder="Skaner qiling yoki Ism yozing..."
                        />
                    </div>
                    <button onClick={handleSearch} disabled={searchLoading} style={{
                        padding: '0 25px',
                        background: '#1a1a1a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        fontWeight: '700'
                    }}>
                        {searchLoading ? "..." : "Izlash"}
                    </button>
                </div>

                {searchLoading && (
                    <div style={{
                        padding: '15px',
                        textAlign: 'center',
                        background: '#e7f0ff',
                        borderRadius: '12px',
                        color: '#2f54ff',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        marginBottom: '20px',
                        animation: 'pulse 1.5s infinite'
                    }}>
                        🔍 Turniket loglari jonli tekshirilmoqda...
                    </div>
                )}

                {searchResult && (
                    <div style={{ animation: 'slideIn 0.4s ease-out' }}>
                        <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '18px', marginBottom: '20px', border: '1px solid #eee' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: '#666', fontSize: '0.85rem' }}>Mijoz:</span>
                                <b style={{ fontSize: '1.05rem' }}>{searchResult.customerName || 'Noma\'lum'}</b>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#666', fontSize: '0.85rem' }}>Holati:</span>
                                <span style={{
                                    padding: '2px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    background: searchResult.status === -1 ? '#fff0f0' : '#ebfbee',
                                    color: searchResult.status === -1 ? '#f03e3e' : '#37b24d'
                                }}>
                                    {searchResult.status === -1 ? '🔴 BEKOR QILINGAN' : '🟢 AKTIV'}
                                </span>
                            </div>
                        </div>

                        <h4 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#333' }}>Biriktirilgan Karusellar</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {searchResult.carousels.map(rel => {
                                const isUsed = rel.status === 1;
                                const isRefunded = rel.status === -1;
                                const canRefund = rel.status === 0;

                                return (
                                    <div key={rel.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '14px 18px',
                                        background: isUsed ? '#f1f3f5' : isRefunded ? '#fff5f5' : '#fff',
                                        borderRadius: '14px',
                                        border: '1px solid ' + (isUsed ? '#dee2e6' : isRefunded ? '#ffa8a8' : '#e9ecef'),
                                        opacity: isRefunded ? 0.7 : 1
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {/* CHECKBOX: FAQAT ISHLATILMAGANLAR UCHUN! */}
                                            {canRefund ? (
                                                <input
                                                    type="checkbox"
                                                    checked={refundCarousels.includes(rel.carouselId)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setRefundCarousels([...refundCarousels, rel.carouselId]);
                                                        else setRefundCarousels(refundCarousels.filter(id => id !== rel.carouselId));
                                                    }}
                                                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                                />
                                            ) : (
                                                <div style={{ width: '20px', height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                    {isUsed ? '🚫' : '❌'}
                                                </div>
                                            )}
                                            <span style={{ fontWeight: '600', color: isUsed ? '#868e96' : '#212529' }}>{rel.carousel?.name}</span>
                                        </div>

                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                fontWeight: '800',
                                                textTransform: 'uppercase',
                                                color: isUsed ? '#495057' : isRefunded ? '#e03131' : '#2f54ff',
                                                padding: '4px 8px',
                                                background: isUsed ? '#e9ecef' : isRefunded ? '#ffe3e3' : '#edf2ff',
                                                borderRadius: '6px'
                                            }}>
                                                {isUsed ? "✅ Foydalanildi" : (isRefunded ? "Vozvrat bo'ldi" : "Kutilmoqda")}
                                            </span>
                                            {isUsed && <div style={{ fontSize: '10px', color: '#adb5bd', marginTop: '2px' }}>Turniketdan o'tilgan</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {searchResult.status !== -1 && (
                            <button
                                onClick={handleRefund}
                                disabled={searchLoading || refundCarousels.length === 0}
                                style={{
                                    padding: '16px',
                                    marginTop: '25px',
                                    width: '100%',
                                    background: refundCarousels.length > 0 ? '#ff4d4f' : '#adb5bd',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    borderRadius: '16px',
                                    fontWeight: '700',
                                    fontSize: '1rem',
                                    boxShadow: refundCarousels.length > 0 ? '0 10px 20px -5px rgba(255, 77, 79, 0.4)' : 'none',
                                    transition: 'all 0.3s'
                                }}>
                                {refundCarousels.length > 0
                                    ? `Tanlanganlarni (${refundCarousels.length} ta) Vozvrat Qilish`
                                    : "Vozvrat uchun tanlang"}
                            </button>
                        )}

                        {searchResult.carousels.some(r => r.status === 1) && (
                            <p style={{ marginTop: '15px', color: '#666', fontSize: '0.8rem', textAlign: 'center', fontStyle: 'italic' }}>
                                * Ishlatilgan (turniketdan o'tilgan) karusellar bo'yicha pul qaytarilmaydi.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* CHOP ETISH UCHUN QISM */}
            {generatedCode && (
                <div id="print-section" style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
                    <div style={{ padding: '20px', border: '1px dashed #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px', margin: '0 auto', fontFamily: 'monospace' }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>XIVA LOKOMOTIV BOG'I</h3>
                        <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', width: '100%', padding: '10px 0', textAlign: 'center' }}>
                            <p style={{ margin: '2px 0' }}>Mijoz: {customerName}</p>
                            <p style={{ margin: '2px 0' }}>Chipta: {generatedCode.qrString}</p>
                        </div>
                        <p style={{ margin: '10px 0 5px 0', fontSize: '11px', fontWeight: 'bold' }}>Tanlangan karusellar:</p>
                        <ul style={{ margin: '0 0 15px 0', paddingLeft: '20px', fontSize: '11px', width: '100%', textAlign: 'left' }}>
                            {generatedCode.selectedNames?.map((n, i) => <li key={i}>{n}</li>)}
                        </ul>
                        <div style={{ background: '#fff', padding: '10px' }}>
                            <QRCodeSVG value={generatedCode.qrString} size={160} level={"H"} />
                        </div>
                        <p style={{ fontSize: '10px', marginTop: '15px' }}>{new Date(generatedCode.createdAt).toLocaleString()}</p>
                        <p style={{ fontSize: '9px', opacity: 0.8 }}>Bilet 24 soat davomida amal qiladi</p>
                    </div>
                </div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                
                @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
                
                @keyframes slideIn {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                input:focus {
                    border-color: #2f54ff !important;
                    box-shadow: 0 0 0 4px rgba(47, 84, 255, 0.1);
                    outline: none;
                }

                button:active {
                    transform: scale(0.98);
                }

                @media print {
                    .no-print { display: none !important; }
                    body { visibility: hidden; }
                    #print-section { 
                        visibility: visible !important; 
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                    }
                }
            `}</style>
        </div>
    );

};

export default KassirPanel;
