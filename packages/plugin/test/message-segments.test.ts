/**
 * 消息段工厂
 *
 * 范式: docs/message-send-pattern.md
 * 业务代码禁止手写消息段字面量, 范围内的 8 种类型一律经工厂构造。
 */

import { describe, expect, it } from 'vitest';
import {
    createAtMessage,
    createFaceMessage,
    createFileMessage,
    createForwardNode,
    createImageMessage,
    createMFaceMessage,
    createReplyMessage,
    createTextMessage,
} from '../src/handlers/utils';

describe('消息段工厂', () => {
    it('文本', () => {
        expect(createTextMessage('hi')).toEqual({ type: 'text', data: { text: 'hi' } });
    });

    it('QQ 表情', () => {
        expect(createFaceMessage('4')).toEqual({ type: 'face', data: { id: '4' } });
    });

    it('@ 不传 name 时不产生 name 字段', () => {
        expect(createAtMessage('10001')).toEqual({ type: 'at', data: { qq: '10001' } });
    });

    it('@全体成员只是 qq 取 all 的 at 段', () => {
        expect(createAtMessage('all')).toEqual({ type: 'at', data: { qq: 'all' } });
    });

    it('@ 传 name 时带上群昵称', () => {
        expect(createAtMessage('10001', '昵称')).toEqual({
            type: 'at',
            data: { qq: '10001', name: '昵称' },
        });
    });

    it('回复', () => {
        expect(createReplyMessage('123')).toEqual({ type: 'reply', data: { id: '123' } });
    });

    it('图片 (支持路径 / URL / base64://)', () => {
        expect(createImageMessage('base64://abc')).toEqual({
            type: 'image',
            data: { file: 'base64://abc' },
        });
    });

    it('商城表情', () => {
        expect(createMFaceMessage(1, '2', 'key', 'summary')).toEqual({
            type: 'mface',
            data: { emoji_package_id: 1, emoji_id: '2', key: 'key', summary: 'summary' },
        });
    });

    it('文件不传 name 时不产生 name 字段', () => {
        expect(createFileMessage('/tmp/a.txt')).toEqual({
            type: 'file',
            data: { file: '/tmp/a.txt' },
        });
    });

    it('文件传 name', () => {
        expect(createFileMessage('/tmp/a.txt', 'a.txt')).toEqual({
            type: 'file',
            data: { file: '/tmp/a.txt', name: 'a.txt' },
        });
    });

    it('合并转发节点不传 userId 时不产生该字段', () => {
        const content = [createTextMessage('x')];
        expect(createForwardNode('bot', content)).toEqual({
            type: 'node',
            data: { nickname: 'bot', content },
        });
    });

    it('合并转发节点传 userId', () => {
        const content = [createTextMessage('x')];
        expect(createForwardNode('bot', content, '10001')).toEqual({
            type: 'node',
            data: { nickname: 'bot', content, user_id: '10001' },
        });
    });
});
