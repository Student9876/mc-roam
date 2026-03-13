import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const THEMES = {
    dark: {
        '--color-bg-root':     '#121212',
        '--color-bg-base':     '#18181b',
        '--color-bg-surface':  '#1e1e1e',
        '--color-bg-elevated': '#27272a',
        '--color-bg-overlay':  '#202023',
        '--color-bg-muted':    '#252525',
        '--color-bg-deep':     '#0a0a0a',
        '--color-bg-terminal': '#111111',
        '--color-border':        '#3f3f46',
        '--color-border-subtle': '#333333',
        '--color-border-medium': '#444444',
        '--color-text-primary':    '#ffffff',
        '--color-text-secondary':  '#e0e0e0',
        '--color-text-sec':        '#a1a1aa',
        '--color-text-muted':      '#71717a',
        '--color-text-faint':      '#666666',
        '--color-text-dim':        '#888888',
        '--color-text-code':       '#cccccc',
        '--color-accent-green':    '#22c55e',
        '--color-accent-green2':   '#40c057',
        '--color-accent-green3':   '#4ade80',
        '--color-accent-green4':   '#10b981',
        '--color-accent-green5':   '#69db7c',
        '--color-accent-blue':     '#3b82f6',
        '--color-accent-blue2':    '#4dabf7',
        '--color-accent-blue3':    '#228be6',
        '--color-accent-blue4':    '#2563eb',
        '--color-accent-yellow':   '#fab005',
        '--color-accent-yellow2':  '#fbbf24',
        '--color-accent-red':      '#ef4444',
        '--color-accent-red2':     '#fa5252',
        '--color-accent-red3':     '#dc2626',
        '--color-accent-orange':   '#f97316',
        '--color-accent-orange2':  '#fd7e14',
        '--color-accent-purple':   '#a78bfa',
    },
    light: {
        '--color-bg-root':     '#f5f5f5',
        '--color-bg-base':     '#ffffff',
        '--color-bg-surface':  '#f0f0f0',
        '--color-bg-elevated': '#e8e8e8',
        '--color-bg-overlay':  '#ebebeb',
        '--color-bg-muted':    '#e0e0e0',
        '--color-bg-deep':     '#d4d4d4',
        '--color-bg-terminal': '#fafafa',
        '--color-border':        '#d4d4d8',
        '--color-border-subtle': '#e4e4e7',
        '--color-border-medium': '#c4c4c4',
        '--color-text-primary':    '#18181b',
        '--color-text-secondary':  '#27272a',
        '--color-text-sec':        '#52525b',
        '--color-text-muted':      '#71717a',
        '--color-text-faint':      '#a1a1aa',
        '--color-text-dim':        '#71717a',
        '--color-text-code':       '#3f3f46',
        '--color-accent-green':    '#16a34a',
        '--color-accent-green2':   '#15803d',
        '--color-accent-green3':   '#22c55e',
        '--color-accent-green4':   '#059669',
        '--color-accent-green5':   '#4ade80',
        '--color-accent-blue':     '#2563eb',
        '--color-accent-blue2':    '#3b82f6',
        '--color-accent-blue3':    '#1d4ed8',
        '--color-accent-blue4':    '#1e40af',
        '--color-accent-yellow':   '#d97706',
        '--color-accent-yellow2':  '#f59e0b',
        '--color-accent-red':      '#dc2626',
        '--color-accent-red2':     '#ef4444',
        '--color-accent-red3':     '#b91c1c',
        '--color-accent-orange':   '#ea580c',
        '--color-accent-orange2':  '#c2410c',
        '--color-accent-purple':   '#7c3aed',
    },
};

function applyTheme(themeName) {
    const vars = THEMES[themeName] || THEMES.dark;
    const root = document.documentElement;
    root.setAttribute('data-theme', themeName);
    for (const [key, value] of Object.entries(vars)) {
        root.style.setProperty(key, value);
    }
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        return localStorage.getItem('mc-roam-theme') || 'dark';
    });

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const setTheme = (newTheme) => {
        if (!THEMES[newTheme]) return;
        localStorage.setItem('mc-roam-theme', newTheme);
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, themes: Object.keys(THEMES) }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
    return ctx;
}
