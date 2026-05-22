import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
    // Dastlabki mavzuni aniqlash
    const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'light');

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <button 
            onClick={toggleTheme}
            className="theme-toggle-btn"
            style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                padding: '10px',
                borderRadius: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: 'var(--shadow)',
                position: 'relative',
                overflow: 'hidden'
            }}
            title={theme === 'light' ? 'Tungi rejimga o\'tish' : 'Yorug\' rejimga o\'tish'}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '0.85rem'
            }}>
                {theme === 'light' ? <Moon size={20} fill="currentColor" /> : <Sun size={20} fill="currentColor" />}
            </div>
            <style>{`
                .theme-toggle-btn:hover {
                    transform: scale(1.05);
                    border-color: var(--primary);
                    background: var(--bg-sub);
                }
                .theme-toggle-btn:active {
                    transform: scale(0.95);
                }
            `}</style>
        </button>
    );
};

export default ThemeToggle;
