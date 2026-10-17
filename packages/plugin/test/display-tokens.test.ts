/**
 * 展示块占位符: 解析纯函数
 *
 * 范式: docs/webui-config-pattern.md 的"布局与展示字段"。
 * 前后端共用同一 resolver; 未命中回退空串, 注入值经 HTML 转义。
 */

import {
    EXTENSION_URL_TOKEN,
    escapeHtml,
    PLUGIN_DESCRIPTION_TOKEN,
    PLUGIN_DISPLAY_NAME_TOKEN,
    resolveDisplayContent,
} from 'shared';
import { describe, expect, it } from 'vitest';

describe('resolveDisplayContent', () => {
    it('替换全部占位符且不残留 token', () => {
        const out = resolveDisplayContent(
            `<h3>${PLUGIN_DISPLAY_NAME_TOKEN}</h3><p>${PLUGIN_DESCRIPTION_TOKEN}</p><a href="${EXTENSION_URL_TOKEN}">go</a>`,
            {
                pluginDisplayName: '千岛插件',
                pluginDescription: '定时抓取',
                extensionUrl: '/plugin/x/page/dashboard',
            },
        );
        expect(out).toContain('千岛插件');
        expect(out).toContain('定时抓取');
        expect(out).toContain('/plugin/x/page/dashboard');
        expect(out).not.toContain('{{');
    });

    it('缺失值回退空串', () => {
        const out = resolveDisplayContent(
            `${PLUGIN_DISPLAY_NAME_TOKEN}|${PLUGIN_DESCRIPTION_TOKEN}`,
            {},
        );
        expect(out).toBe('|');
    });

    it('注入值做 HTML 转义', () => {
        const out = resolveDisplayContent(PLUGIN_DESCRIPTION_TOKEN, {
            pluginDescription: '<b>&"x"</b>',
        });
        expect(out).toBe('&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;');
    });

    it('无占位符原样返回', () => {
        expect(resolveDisplayContent('<div>hi</div>', {})).toBe(
            '<div>hi</div>',
        );
    });
});

describe('escapeHtml', () => {
    it('转义五个 HTML 元字符', () => {
        expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
    });
});
