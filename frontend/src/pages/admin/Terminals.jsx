import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Play, Trash2, Edit3, Plus } from 'lucide-react';
import { API_URL } from '../../apiConfig';

const Terminals = () => {
    const [terminals, setTerminals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', ipAddress: '', port: '80', username: '', password: '', status: 'active' });
    const [editId, setEditId] = useState(null);

    const fetchTerminals = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/terminals`);
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
                await axios.put(`${API_URL}/terminals/${editId}`, form);
            } else {
                await axios.post(`${API_URL}/terminals`, form);
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
        <div>
            <h1 className="page-title">Terminallar.</h1>
            <div className="page-subtitle">Hikvision qurilmalari va IP sozlamalar.</div>

            <div className="stat-card" style={{ marginBottom: '30px' }}>
                <div className="sc-header" style={{ marginBottom: '20px' }}>
                    {editId ? 'Tahrirlash: ' + form.name : 'Yangi Qurilma Qo\'shish'}
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input className="form-input" style={{ flex: 1, minWidth: '150px', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e0e0e0' }} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nomi" required />
                    <input className="form-input" style={{ flex: 1, minWidth: '150px', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e0e0e0' }} value={form.ipAddress} onChange={e => setForm({...form, ipAddress: e.target.value})} placeholder="IP Manzil (10.70...)" required />
                    <input className="form-input" style={{ width: '80px', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e0e0e0' }} value={form.port} onChange={e => setForm({...form, port: e.target.value})} placeholder="Port" required />
                    <input className="form-input" style={{ flex: 1, minWidth: '150px', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e0e0e0' }} value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Login" required />
                    <input className="form-input" style={{ flex: 1, minWidth: '150px', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e0e0e0' }} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Parol" type="password" required />
                    
                    <button type="submit" className="btn btn-primary">
                        {editId ? <Edit3 size={16}/> : <Plus size={16}/>} {editId ? 'Saqlash' : "Qo'shish"}
                    </button>
                    {editId && <button type="button" className="btn" style={{ background: '#f0f0f0' }} onClick={() => { setEditId(null); setForm({ name: '', ipAddress: '', port: '80', username: '', password: '', status: 'active' }); }}>Bekor</button>}
                </form>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Nomi</th>
                            <th>IP : Port</th>
                            <th>Login</th>
                            <th>Holat</th>
                            <th style={{ textAlign: 'right' }}>Amallar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="5" style={{ textAlign: 'center' }}>Yuklanmoqda...</td></tr> : 
                        terminals.map(t => (
                            <tr key={t.id}>
                                <td style={{ fontWeight: 600 }}>{t.name}</td>
                                <td><span style={{ background: 'var(--admin-bg)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{t.ipAddress}:{t.port}</span></td>
                                <td>{t.username}</td>
                                <td>
                                    <span style={{ color: t.status === 'active' ? 'var(--success)' : 'var(--text-muted)' }}>● {t.status}</span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="icon-btn" style={{ display: 'inline-flex', color: 'var(--primary)' }} onClick={() => testConnection(t)} title="Sinash"><Play size={18} /></button>
                                    <button className="icon-btn" style={{ display: 'inline-flex', color: 'var(--warning)' }} onClick={() => handleEdit(t)} title="Tahrir"><Settings size={18} /></button>
                                    <button className="icon-btn" style={{ display: 'inline-flex', color: 'var(--danger)' }} onClick={() => handleDelete(t.id)} title="O'chirish"><Trash2 size={18} /></button>
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
