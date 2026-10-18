/**
 * 原生面板 Schema 映射
 *
 * 范式: docs/webui-config-pattern.md 的"字段 kind 分类表"与"字段可见范围 (scope)"。
 * 用最小假 ctx 验证 buildConfigSchema 的 scope 过滤与 password 引导块映射。
 */

import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { describe, expect, it } from 'vitest';
import { buildConfigSchema } from '../src/config';

interface FakeItem {
    type: string;
    key?: string;
    label?: string;
    content?: string;
    options?: unknown;
    default?: unknown;
}

function item(
    type: string,
    key: string,
    label: string,
    def?: unknown,
): FakeItem {
    return { type, key, label, default: def };
}

function makeCtx(): NapCatPluginContext {
    const NapCatConfig = {
        boolean: (key: string, label: string, def?: unknown) =>
            item('boolean', key, label, def),
        text: (key: string, label: string, def?: unknown) =>
            item('text', key, label, def),
        number: (key: string, label: string, def?: unknown) =>
            item('number', key, label, def),
        select: (
            key: string,
            label: string,
            options: unknown,
            def?: unknown,
        ) => ({ ...item('select', key, label, def), options }),
        multiSelect: (
            key: string,
            label: string,
            options: unknown,
            def?: unknown,
        ) => ({ ...item('multi-select', key, label, def), options }),
        html: (content: string): FakeItem => ({
            type: 'html',
            content,
        }),
        plainText: (content: string): FakeItem => ({
            type: 'text',
            content,
        }),
        combine: (...items: FakeItem[]): FakeItem[] => items,
    };
    return {
        pluginName: 'test-plugin',
        pluginManager: {
            getPluginInfo: () => ({
                packageJson: {
                    plugin: '测试插件',
                    description: '测试用',
                },
            }),
        },
        NapCatConfig,
    } as unknown as NapCatPluginContext;
}

const schema = buildConfigSchema(makeCtx()) as unknown as FakeItem[];

describe('buildConfigSchema', () => {
    it('scope 为 webui 的字段不出现在原生面板', () => {
        expect(schema.some((it) => it.key === 'triggerModes')).toBe(
            false,
        );
    });

    it('password(both) 渲染为禁用的引导输入框, 右侧按钮指向自建前端仪表盘', () => {
        const hint = schema.find(
            (it) =>
                it.type === 'html' &&
                it.content?.includes('#/status') === true,
        );
        expect(hint).toBeDefined();
        expect(hint?.content).toContain(
            '/plugin/test-plugin/page/dashboard#/status',
        );
        expect(hint?.content).toContain('示例密钥');
        expect(hint?.content).toContain('disabled');
        expect(hint?.content).not.toContain('{{');
    });

    it('section 渲染为加粗标题', () => {
        const section = schema.find(
            (it) =>
                it.type === 'html' &&
                it.content?.includes('font-semibold') === true &&
                it.content?.includes('示例字段') === true,
        );
        expect(section).toBeDefined();
    });

    it('其余 kind 映射到对应控件', () => {
        const byKey = new Map(
            schema
                .filter((it) => it.key !== undefined)
                .map((it) => [it.key, it]),
        );
        expect(byKey.get('adminUsers')?.type).toBe('text');
        expect(byKey.get('exampleBoolean')?.type).toBe('boolean');
        expect(byKey.get('exampleText')?.type).toBe('text');
        expect(byKey.get('exampleNumber')?.type).toBe('number');
        expect(byKey.get('exampleSelect')?.type).toBe('select');
        expect(byKey.get('exampleMultiSelect')?.type).toBe(
            'multi-select',
        );
    });

    it('display 横幅解析占位符', () => {
        const banner = schema.find(
            (it) =>
                it.type === 'html' &&
                it.content?.includes('跳转至拓展页面') === true,
        );
        expect(banner?.content).toContain('测试插件');
        expect(banner?.content).not.toContain('{{');
    });
});
