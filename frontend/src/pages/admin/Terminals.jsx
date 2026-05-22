import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Play, Trash2, Edit3, Plus, Smartphone, Database } from 'lucide-react';
import { API_URL } from '../../apiConfig';

const Terminals = () => {
    const [terminals, setTerminals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', ipAddress: '', port: '80', username: '', password: '', status: 'active' });
    const [editId, setEditId] = useState(null);

    const user = JSON.parse(localStorage.getItem('user'));

    const fetchTerminals = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/terminals?organizationId=${user?.organizationId}`);
            setTerminals(res.data);
        } catch (error) {
            console.error("Error fetching terminals:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTerminals();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await axios.put(`${API_URL}/terminals/${editId}`, { ...form, organizationId: user?.organizationId });
            } else {
                await axios.post(`${API_URL}/terminals`, { ...form, organizationId: user?.organizationId });
            }
            setForm({ name: '', ipAddress: '', port: '80', username: '', password: '', status: 'active' });
            setEditId(null);
            fetchTerminals();
        } catch (error) {
            alert("Xatolik yuz berdi: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Rostdan o'chirmoqchimisiz?")) return;
        try {
            await axios.delete(`${API_URL}/terminals/${id}`);
            fetchTerminals();
        } catch (error) {
            alert("Xatolik: ushbu terminalga karusel ulangan bo'lishi mumkin.");
        }
    };

    const handleEdit = (t) => {
        setForm({ name: t.name, ipAddress: t.ipAddress, port: t.port, username: t.username, password: t.password, status: t.status });
        setEditId(t.id);
    };

    const testConnection = async (terminal) => {
        try {
            const res = await axios.post(`${API_URL}/terminals/test`, {
                ipAddress: terminal.ipAddress,
                port: terminal.port,
                username: terminal.username,
                password: terminal.password
            });
            if(res.data.success) {
                alert("Muvaffaqiyatli! " + res.data.message);
            } else {
                alert("Xato: " + res.data.message);
            }
        } catch (error) {
            alert(error.response?.data?.message || "Aloqa yo'q: Backend xatosi");
        }
    };

    return (
        <div className="fade-in outfit">
            <h1 className="page-title">Terminallar.</h1>
            <p className="page-subtitle">Hikvision qurilmalari va IP manzillarini markazlashtirilgan nazorati.</p>

            <div className="stat-card" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ background: 'var(--bg-sub)', padding: '10px', borderRadius: '12px' }}>
                        <Database color="var(--primary)" size={18} />
                    </div>
                    <div className="sc-header">{editId ? 'Terminalni Tahrirlash' : 'Yangi Qurilma Qo\'shish'}</div>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '16px', alignItems: 'center' }}>
                    <input className="form-input" style={{ width: '100%' }} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Qurilma nomi" required />
                    <input className="form-input" style={{ width: '100%' }} value={form.ipAddress} onChange={e => setForm({...form, ipAddress: e.target.value})} placeholder="IP Manzil" required />
                    <input className="form-input" style={{ width: '100%' }} value={form.port} onChange={e => setForm({...form, port: e.target.value})} placeholder="Port" required />
                    <input className="form-input" style={{ width: '100%' }} value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Login" required />
                    <input className="form-input" style={{ width: '100%' }} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Parol" type="password" required />
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" className="btn-primary" style={{ padding: '0 24px', height: '52px' }}>
                            {editId ? 'Saqlash' : "Qo'shish"}
                        </button>
                        {editId && <button type="button" className="btn-logout" style={{ background: 'var(--bg-sub)', color: 'var(--admin-text-muted)' }} onClick={() => { setEditId(null); setForm({ name: '', ipAddress: '', port: '80', username: '', password: '', status: 'active' }); }}>Bekor qilish</button>}
                    </div>
                </form>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>QURILMA NOMI</th>
                            <th>XOST / PORT</th>
                            <th>FOYDALANUVCHI</th>
                            <th>HOLATI</th>
                            <th style={{ textAlign: 'right' }}>AMALLAR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '100px' }}>Yuklanmoqda...</td></tr> : 
                        terminals.map(t => (
                            <tr key={t.id}>
                                <td style={{ fontWeight: 800, color: 'var(--admin-text-main)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Smartphone size={18} color="var(--primary)" />
                                        {t.name}
                                    </div>
                                </td>
                                <td>
                                    <code style={{ background: 'var(--bg-sub)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--admin-border)', color: 'var(--primary)', fontWeight: 700 }}>
                                        {t.ipAddress}:{t.port}
                                    </code>
                                </td>
                                <td>{t.username}</td>
                                <td>
                                    <span className={`status-pill ${t.status === 'active' ? 'success' : 'warning'}`}>
                                        {t.status === 'active' ? 'Faol' : 'Nofaol'}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button className="icon-btn" style={{ color: 'var(--success)' }} onClick={() => testConnection(t)} title="Sinash"><Play size={18} /></button>
                                    <button className="icon-btn" style={{ color: 'var(--warning)' }} onClick={() => handleEdit(t)} title="Tahrir"><Settings size={18} /></button>
                                    <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(t.id)} title="O'chirish"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Terminals;
