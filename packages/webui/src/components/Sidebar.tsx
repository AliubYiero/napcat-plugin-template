import type { ComponentType } from 'react';
import { PAGE_LIST, type PageIconName, type PageId } from 'shared';
import {
    IconDashboard,
    IconGithub,
    IconGroup,
    IconPlugin,
    IconSettings,
    IconSun,
} from './icons';

interface SidebarProps {
    currentPage: PageId;
    onPageChange: (page: PageId) => void;
}

/** 图标注册表: PageMeta.icon → 图标组件 */
const PAGE_ICONS: Record<
    PageIconName,
    ComponentType<{ size?: number; className?: string }>
> = {
    dashboard: IconDashboard,
    settings: IconSettings,
    group: IconGroup,
};

const menuItems = [...PAGE_LIST]
    .filter((page) => !page.hidden)
    .sort((a, b) => a.order - b.order);

export default function Sidebar({
    currentPage,
    onPageChange,
}: SidebarProps) {
    return (
        <aside className="w-60 flex-shrink-0 bg-white dark:bg-[#1a1b1d] border-r border-gray-200 dark:border-gray-800 flex flex-col">
            {/* Logo */}
            <div className="px-5 py-6 flex items-center gap-3">
                <div className="sidebar-logo w-8 h-8 flex items-center justify-center bg-brand-500 rounded-lg text-white">
                    <IconPlugin size={18} />
                </div>
                <div>
                    <h1 className="font-bold text-sm leading-tight text-gray-900 dark:text-white">
                        {__PLUGIN_DISPLAY_NAME__}
                    </h1>
                    <p className="text-[10px] text-gray-400 font-medium tracking-wider">
                        NAPCAT PLUGIN
                    </p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto nav-stagger">
                {menuItems.map((item) => {
                    const Icon = PAGE_ICONS[item.icon];
                    return (
                        <button
                            type="button"
                            key={item.id}
                            className={`sidebar-item ${currentPage === item.id ? 'active' : ''}`}
                            onClick={() => onPageChange(item.id)}
                        >
                            <span className="sidebar-icon">
                                <Icon size={18} />
                            </span>
                            <span>{item.title}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-3 pb-2">
                <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sidebar-item no-underline"
                >
                    <IconGithub size={18} />
                    <span>反馈问题</span>
                </a>
            </div>

            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-center w-full py-2 rounded-lg text-gray-500 bg-gray-50 dark:bg-gray-800/50 cursor-default text-xs gap-2">
                    <IconSun size={14} className="opacity-60" />
                    <span>跟随系统主题</span>
                </div>
            </div>
        </aside>
    );
}
