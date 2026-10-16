/**
 * 帮助输出版本映射
 *
 * 范式: docs/help-output-pattern.md
 * 版本由"角色 + 会话类型"共同决定, 与权限档位非一一对应。
 */

import { describe, expect, it } from 'vitest';
import { getHelpVariant } from '../src/utils/helpMessage';

describe('getHelpVariant', () => {
    it('普通用户任意会话 → user 版', () => {
        expect(getHelpVariant('user', false)).toBe('user');
        expect(getHelpVariant('user', true)).toBe('user');
    });

    it('群管理员任意会话 → admin 版', () => {
        expect(getHelpVariant('admin', true)).toBe('admin');
        expect(getHelpVariant('admin', false)).toBe('admin');
    });

    it('好友私聊用户 (privateUser) → admin 版', () => {
        expect(getHelpVariant('privateUser', false)).toBe('admin');
    });

    it('群聊超管 → admin 版 (SuperAdmin 版含仅私聊指令, 群聊中会误导)', () => {
        expect(getHelpVariant('superAdmin', true)).toBe('admin');
    });

    it('私聊超管 → superAdmin 版', () => {
        expect(getHelpVariant('superAdmin', false)).toBe(
            'superAdmin',
        );
    });
});
