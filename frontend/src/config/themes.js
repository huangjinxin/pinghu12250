/**
 * 主题配置
 * 经典蓝紫（当前）+ 科技蓝（新）
 */

export const themes = {
    // 经典蓝紫主题（当前使用的）
    classic: {
        name: '经典蓝紫',
        description: '原有配色，柔和优雅',
        colors: {
            primaryColor: '#6366f1',
            primaryColorHover: '#818cf8',
            primaryColorPressed: '#4f46e5',
            primaryColorSuppl: '#a5b4fc',
        },
        // Tailwind CSS 变量
        cssVars: {
            '--primary-50': '#eef2ff',
            '--primary-100': '#e0e7ff',
            '--primary-200': '#c7d2fe',
            '--primary-300': '#a5b4fc',
            '--primary-400': '#818cf8',
            '--primary-500': '#6366f1',
            '--primary-600': '#4f46e5',
            '--primary-700': '#4338ca',
            '--primary-800': '#3730a3',
            '--primary-900': '#312e81',
            '--sidebar-bg': 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)',
            '--sidebar-text': '#e0e7ff',
            '--sidebar-active-bg': 'rgba(99, 102, 241, 0.2)',
        },
    },

    // 科技蓝主题（新设计）
    tech: {
        name: '科技蓝',
        description: '现代科技感，清新明亮',
        colors: {
            primaryColor: '#3b82f6',
            primaryColorHover: '#60a5fa',
            primaryColorPressed: '#2563eb',
            primaryColorSuppl: '#93c5fd',
        },
        cssVars: {
            '--primary-50': '#eff6ff',
            '--primary-100': '#dbeafe',
            '--primary-200': '#bfdbfe',
            '--primary-300': '#93c5fd',
            '--primary-400': '#60a5fa',
            '--primary-500': '#3b82f6',
            '--primary-600': '#2563eb',
            '--primary-700': '#1d4ed8',
            '--primary-800': '#1e40af',
            '--primary-900': '#1e3a8a',
            '--sidebar-bg': 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)',
            '--sidebar-text': '#dbeafe',
            '--sidebar-active-bg': 'rgba(59, 130, 246, 0.2)',
        },
    },

    // 暗夜主题
    dark: {
        name: '暗夜模式',
        description: '深色背景，护眼模式',
        colors: {
            primaryColor: '#60a5fa',
            primaryColorHover: '#93c5fd',
            primaryColorPressed: '#3b82f6',
            primaryColorSuppl: '#bfdbfe',
        },
        cssVars: {
            '--primary-50': '#1e293b',
            '--primary-100': '#334155',
            '--primary-200': '#475569',
            '--primary-300': '#64748b',
            '--primary-400': '#94a3b8',
            '--primary-500': '#60a5fa',
            '--primary-600': '#3b82f6',
            '--primary-700': '#2563eb',
            '--primary-800': '#1d4ed8',
            '--primary-900': '#1e40af',
            '--sidebar-bg': 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            '--sidebar-text': '#e2e8f0',
            '--sidebar-active-bg': 'rgba(96, 165, 250, 0.2)',
            '--bg-base': '#0f172a',
            '--bg-card': '#1e293b',
            '--text-primary': '#f1f5f9',
            '--text-secondary': '#94a3b8',
        },
    },
};

export const defaultTheme = 'classic';
