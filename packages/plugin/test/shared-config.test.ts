/**
 * 配置单一声明源: 派生正确性
 *
 * 范式: docs/webui-config-pattern.md
 * 覆盖 shared/src/config.ts 的三条派生链: FIELDS → 默认值 / 清洗 / codec。
 * 字段级清洗容错规则见 sanitize-config.test.ts。
 */

import {
    FIELDS,
    getDefaultConfig,
    parseStringList,
    sanitizeConfig,
} from 'shared';
import { describe, expect, it } from 'vitest';

const EXPECTED_KEYS = [
    'enabled',
    'allowAtBotTrigger',
    'commandPrefix',
    'adminUsers',
];

type ValueField = Extract<(typeof FIELDS)[number], { key: string }>;

describe('FIELDS 声明源', () => {
    it('有值字段键集与 PluginConfig 一致', () => {
        const keys = FIELDS.filter(
            (field): field is ValueField => 'key' in field,
        ).map((field) => field.key);
        expect([...keys].sort()).toEqual([...EXPECTED_KEYS].sort());
    });

    it('每个有值字段都声明了可渲染的 base kind 与默认值', () => {
        const valueKinds = [
            'boolean',
            'text',
            'number',
            'select',
            'multiSelect',
            'stringList',
        ];
        for (const field of FIELDS) {
            if (!('key' in field)) continue;
            expect(valueKinds).toContain(field.kind);
            expect(field).toHaveProperty('default');
        }
    });
});

describe('getDefaultConfig: 从 FIELDS 派生', () => {
    it('返回值正确, 且每次新建 (数组不共享)', () => {
        const a = getDefaultConfig();
        const b = getDefaultConfig();
        expect(a).toEqual({
            enabled: true,
            allowAtBotTrigger: true,
            commandPrefix: '#cmd',
            adminUsers: [],
        });
        expect(a).not.toBe(b);
        expect(a.adminUsers).not.toBe(b.adminUsers);
    });
});

describe('parseStringList codec', () => {
    it('逗号分隔 → 去空白去空项', () => {
        expect(parseStringList(' 10001 , 10002 ,, ')).toEqual([
            '10001',
            '10002',
        ]);
        expect(parseStringList(',,,')).toEqual([]);
    });
});

describe('sanitizeConfig: 从 kind 派生 (代表用例)', () => {
    it('整体非法回退默认', () => {
        expect(sanitizeConfig(null)).toEqual(getDefaultConfig());
        expect(sanitizeConfig([1, 2])).toEqual(getDefaultConfig());
    });

    it('stringList: 逗号串/数组容错, 空数组合法, 类型不符回退默认', () => {
        expect(
            sanitizeConfig({ adminUsers: '1, 2' }).adminUsers,
        ).toEqual(['1', '2']);
        expect(
            sanitizeConfig({ adminUsers: [1, ' 2 '] }).adminUsers,
        ).toEqual(['1', '2']);
        expect(sanitizeConfig({ adminUsers: [] }).adminUsers).toEqual(
            [],
        );
        expect(
            sanitizeConfig({ adminUsers: 123 }).adminUsers,
        ).toEqual([]);
    });

    it('boolean: 显式 false 是语义, 不回退默认', () => {
        expect(
            sanitizeConfig({ allowAtBotTrigger: false })
                .allowAtBotTrigger,
        ).toBe(false);
    });
});
