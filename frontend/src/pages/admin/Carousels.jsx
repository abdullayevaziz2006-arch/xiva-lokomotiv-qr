import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, Trash2, Plus } from 'lucide-react';
import { API_URL } from '../../apiConfig';

const Carousels = () => {
    const [carousels, setCarousels] = useState([]);
    const [terminals, setTerminals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', description: '', terminalId: '' });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [cRes, tRes] = await Promise.all([
                axios.get(`${API_URL}/carousels`),
                axios.get(`${API_URL}/terminals`)
            ]);
            setCarousels(cRes.data);
            setTerminals(tRes.data);
        } catch (error) {
            console.error("Fetch xatosi:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/carousels`, form);
            setForm({ name: '', description: '', terminalId: '' });
            fetchData();
        } catch (error) {
            alert("Xatolik: " + error.response?.data?.error || error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("O'chirmoqchimisiz?")) return;
        try {
            await axios.delete(`${API_URL}/carousels/${id}`);
            fetchData();
        } catch (error) {
            alert("Xatolik yuz berdi");
        }
    };

    return (
        <div>
            <h1 className="page-title">O'yingohlar.</h1>
            <div className="page-subtitle">Istirohat bog'idagi aktiv o'yingohlar (Karusellar) va ularning terminallari.</div>

            <div className="stat-card" style={{ marginBottom: '30px' }}>
                <div className="sc-header" style={{ marginBottom: '20px' }}>Yangi O'yingoh Qo'shish</div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input className="form-input" style={{ flex: 1, padding: '10px 15px', borderRadius: '8px', border: '1px solid #e0e0e0' }} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Karusel nomi" required />
                    <input className="form-input" style={{ flex: 1.5, padding: '10px 15px', borderRadius: '8px', border: '1px solid #e0e0e0' }} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Tavsif (ixtiyoriy)" />
                    
                    <select className="form-input" style={{ flex: 1, padding: '10px 15px', borderRadius: '8px', border: '1px solid #e0e0e0' }} value={form.terminalId} onChange={e => setForm({...form, terminalId: e.target.value})} required>
                        <option value="">-- Terminalni tanlang --</option>
                        {terminals.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.ipAddress})</option>
                        ))}
                    </select>

                    <button type="submit" className="btn btn-primary">
                        <Plus size={16}/> Qo'shish
                    </button>
                </form>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Nomi</th>
                            <th>Tavsif</th>
                            <th>Ulangan Terminal</th>
                            <th>Mas'ul (Tadbirkor)</th>
                            <th style={{ textAlign: 'right' }}>Xarakat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="5" style={{ textAlign: 'center' }}>Yuklanmoqda...</td></tr> : 
                        carousels.map(c => (
                            <tr key={c.id}>
                                <td style={{ fontWeight: 600, color: 'var(--primary)' }}><Target size={14} style={{ marginRight: '5px' }}/> {c.name}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{c.description || '-'}</td>
                                <td>
                                    {c.terminal ? <span style={{ background: '#eafaf1', color: 'var(--success)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{c.terminal.name}</span> : <span style={{color:'red'}}>Ulanmagan</span>}
                                </td>
                                <td>{c.entrepreneur?.fullName || 'Tizim'}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="icon-btn" style={{ display: 'inline-flex', color: 'var(--danger)' }} onClick={() => handleDelete(c.id)} title="O'chirish"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                        {carousels.length === 0 && !loading && <tr><td colSpan="5" style={{textAlign: 'center'}}>Hozircha o'yingohlar yo'q</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Carousels;
