/**
 * 配置清洗: 五类形态的容错规则
 *
 * 范式: docs/config-pattern.md 的"清洗规则分类表"
 * 两条通用原则: 清洗不抛错; 尊重用户显式选择 (空数组/显式 false 是语义, 不是缺失)。
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config';
import { sanitizeConfig } from '../src/core/state';

describe('sanitizeConfig: 输入整体非法', () => {
    it('非对象输入回退默认配置', () => {
        expect(sanitizeConfig(null)).toEqual(DEFAULT_CONFIG);
        expect(sanitizeConfig('nope')).toEqual(DEFAULT_CONFIG);
        expect(sanitizeConfig([1, 2])).toEqual(DEFAULT_CONFIG);
    });

    it('清洗不抛错, 损坏配置下仍能启动', () => {
        expect(() => sanitizeConfig({ groupConfigs: { g: { enabled: 'x' } } })).not.toThrow();
    });
});

describe('sanitizeConfig: 标量', () => {
    it('类型不符时保留默认值', () => {
        const out = sanitizeConfig({ enabled: 'yes', commandPrefix: 123, allowAtBotTrigger: 'no' });
        expect(out.enabled).toBe(DEFAULT_CONFIG.enabled);
        expect(out.commandPrefix).toBe(DEFAULT_CONFIG.commandPrefix);
        expect(out.allowAtBotTrigger).toBe(DEFAULT_CONFIG.allowAtBotTrigger);
    });

    it('类型正确时采纳外部值', () => {
        const out = sanitizeConfig({ enabled: false, commandPrefix: '#bot' });
        expect(out.enabled).toBe(false);
        expect(out.commandPrefix).toBe('#bot');
    });

    it('显式 false 是语义, 不回退默认', () => {
        expect(sanitizeConfig({ allowAtBotTrigger: false }).allowAtBotTrigger).toBe(false);
    });
});

describe('sanitizeConfig: 字符串列表 (超管名单)', () => {
    it('逗号分隔串 → 去空白去空项的数组', () => {
        expect(sanitizeConfig({ adminUsers: ' 10001 , 10002 ,, ' }).adminUsers).toEqual([
            '10001',
            '10002',
        ]);
    });

    it('数组输入同样容错 (元素转字符串并 trim)', () => {
        expect(sanitizeConfig({ adminUsers: [10001, ' 10002 ', ''] }).adminUsers).toEqual([
            '10001',
            '10002',
        ]);
    });

    it('空数组是合法语义, 不回退默认', () => {
        expect(sanitizeConfig({ adminUsers: [] }).adminUsers).toEqual([]);
        expect(sanitizeConfig({ adminUsers: ',,,' }).adminUsers).toEqual([]);
    });

    it('类型不符时保留默认值', () => {
        expect(sanitizeConfig({ adminUsers: 123 }).adminUsers).toEqual(DEFAULT_CONFIG.adminUsers);
    });
});

describe('sanitizeConfig: 嵌套对象 (会话级配置)', () => {
    it('逐字段递归清洗, 语义相同的字段保留', () => {
        const out = sanitizeConfig({ groupConfigs: { g1: { enabled: false } } });
        expect(out.groupConfigs.g1).toEqual({ enabled: false });
    });

    it('整体不合法的条目直接丢弃', () => {
        const out = sanitizeConfig({ groupConfigs: { g1: 'bad', g2: [1] } });
        expect(out.groupConfigs).toEqual({});
    });

    it('字段类型不合法时该字段回退 (此处为缺省)', () => {
        const out = sanitizeConfig({ groupConfigs: { g1: { enabled: 'x' } } });
        expect(out.groupConfigs.g1).toEqual({});
    });

    it('非对象输入时 groupConfigs 仍为对象', () => {
        expect(sanitizeConfig(null).groupConfigs).toEqual({});
    });
});
