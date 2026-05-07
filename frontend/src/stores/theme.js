/**
 * 主题状态管理
 */
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { themes, defaultTheme } from '@/config/themes';

export const useThemeStore = defineStore('theme', () => {
    // 当前主题 key
    const currentTheme = ref(localStorage.getItem('theme') || defaultTheme);

    // 当前主题配置
    const themeConfig = computed(() => themes[currentTheme.value] || themes[defaultTheme]);

    // Naive UI 主题覆盖配置
    const naiveThemeOverrides = computed(() => ({
        common: {
            ...themeConfig.value.colors,
            borderRadius: '8px',
            borderRadiusSmall: '6px',
        },
        Button: {
            borderRadiusMedium: '8px',
            borderRadiusLarge: '10px',
        },
        Card: {
            borderRadius: '12px',
        },
        Input: {
            borderRadius: '8px',
        },
        Select: {
            borderRadius: '8px',
        },
        Tag: {
            borderRadius: '6px',
        },
        Message: {
            borderRadius: '8px',
        },
        Dialog: {
            borderRadius: '12px',
        },
    }));

    // 可用主题列表
    const availableThemes = computed(() =>
        Object.entries(themes).map(([key, config]) => ({
            key,
            name: config.name,
            description: config.description,
        }))
    );

    // 切换主题
    function setTheme(themeKey) {
        if (themes[themeKey]) {
            currentTheme.value = themeKey;
            localStorage.setItem('theme', themeKey);
            applyThemeCssVars();
        }
    }

    // 应用主题 CSS 变量到 document
    function applyThemeCssVars() {
        const cssVars = themeConfig.value.cssVars;
        if (cssVars) {
            Object.entries(cssVars).forEach(([key, value]) => {
                document.documentElement.style.setProperty(key, value);
            });
        }

        // 暗色模式特殊处理
        if (currentTheme.value === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    // 初始化时应用主题
    function initTheme() {
        applyThemeCssVars();
    }

    return {
        currentTheme,
        themeConfig,
        naiveThemeOverrides,
        availableThemes,
        setTheme,
        initTheme,
    };
});
