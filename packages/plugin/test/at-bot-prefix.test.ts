/**
 * `@机器人` CQ 段剥离的边界覆盖
 *
 * 范式: docs/instruction-pattern.md 的 "1.1 @机器人 CQ 段剥离"
 */

import { describe, expect, it } from 'vitest';
import { normalizeRawMessage, stripAtBotPrefix } from '../src/utils/at-bot-prefix';

const SELF = '268491285';

describe('stripAtBotPrefix', () => {
    it('剥离消息开头匹配 selfId 的 at 段', () => {
        expect(stripAtBotPrefix(`[CQ:at,qq=${SELF}] #cmd ping`, SELF)).toBe(' #cmd ping');
    });

    it('CQ 标记大小写不敏感', () => {
        expect(stripAtBotPrefix(`[cq:AT,qq=${SELF}] #cmd ping`, SELF)).toBe(' #cmd ping');
    });

    it('qq 值允许双引号、单引号或裸值', () => {
        expect(stripAtBotPrefix(`[CQ:at,qq="${SELF}"] x`, SELF)).toBe(' x');
        expect(stripAtBotPrefix(`[CQ:at,qq='${SELF}'] x`, SELF)).toBe(' x');
    });

    it('属性顺序不限, 允许额外属性', () => {
        expect(stripAtBotPrefix(`[CQ:at,name=bot,qq=${SELF}] x`, SELF)).toBe(' x');
        expect(stripAtBotPrefix(`[CQ:at,qq=${SELF},name=bot] x`, SELF)).toBe(' x');
    });

    it('只剥离开头第一段, 后续 at 段保留', () => {
        expect(stripAtBotPrefix(`[CQ:at,qq=${SELF}][CQ:at,qq=999] x`, SELF)).toBe(
            '[CQ:at,qq=999] x'
        );
    });

    it('qq 与 selfId 不相等时不剥离', () => {
        expect(stripAtBotPrefix('[CQ:at,qq=999] x', SELF)).toBe('[CQ:at,qq=999] x');
        // 前缀匹配但值更长, 属于不同 QQ 号
        expect(stripAtBotPrefix(`[CQ:at,qq=${SELF}0] x`, SELF)).toBe(`[CQ:at,qq=${SELF}0] x`);
    });

    it('不在开头或不是 at 段时不剥离', () => {
        expect(stripAtBotPrefix(`x [CQ:at,qq=${SELF}]`, SELF)).toBe(`x [CQ:at,qq=${SELF}]`);
        expect(stripAtBotPrefix('[CQ:image,file=a.png] x', SELF)).toBe('[CQ:image,file=a.png] x');
    });

    it('selfId 缺失或为空时跳过剥离, 不抛异常', () => {
        expect(stripAtBotPrefix(`[CQ:at,qq=${SELF}] x`, '')).toBe(`[CQ:at,qq=${SELF}] x`);
        expect(stripAtBotPrefix('', SELF)).toBe('');
    });

    it('只负责剥离, 不负责 trim', () => {
        expect(stripAtBotPrefix(`  [CQ:at,qq=${SELF}] x`, SELF)).toBe(
            `  [CQ:at,qq=${SELF}] x`
        );
    });
});

describe('normalizeRawMessage', () => {
    it('开启时按 trim → 剥离 → trimStart 编排', () => {
        expect(normalizeRawMessage(`  [CQ:at,qq=${SELF}]   #cmd ping  `, SELF, true)).toBe(
            '#cmd ping'
        );
    });

    it('未跟指令时仅剥离开头 at 段', () => {
        expect(normalizeRawMessage(`[CQ:at,qq=${SELF}] 在吗`, SELF, true)).toBe('在吗');
    });

    it('关闭时完全跳过规范化, rawMessage 原样返回', () => {
        const raw = `  [CQ:at,qq=${SELF}] #cmd ping  `;
        expect(normalizeRawMessage(raw, SELF, false)).toBe(raw);
    });
});
