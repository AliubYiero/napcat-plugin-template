/**
 * 会话级配置存储基类
 *
 * 在 BaseStore 的列表存储之上, 补齐"按 `id + type` 定位一条会话配置"的业务语义。
 * 典型场景: 哪些群开启了某推送、每个群的监听上限、某功能在某会话的开关状态。
 *
 * 范式: docs/store-pattern.md
 * - 【必须】单例与延迟实例化由子类实现 (private constructor + static getInstance),
 *   子类在 super() 中传入自己的数据文件名
 * - 【必须】写操作立即落盘 (由 BaseStore 负责)
 * - 【必须】本层不做权限校验: 是否允许改某会话的配置由 handler / service 判断
 */

import { BaseStore } from './BaseStore';

/** 会话类型: 群聊或私聊, 与消息事件的 message_type 同域 */
export type SessionType = 'private' | 'group';

/** 会话配置项必须携带的定位字段, 业务字段由具体子类的泛型补充 */
export interface SessionConfigBase {
    /** 群号或用户 QQ 号 */
    id: string;
    /** 会话类型 */
    type: SessionType;
}

export abstract class SessionConfigStore<T extends SessionConfigBase> extends BaseStore<T> {
    protected constructor(dataFilename: string) {
        super(dataFilename);
    }

    // ==================== 业务语义 ====================

    /**
     * 查找某会话的配置 (返回内部引用, 不要直接改动返回值, 改用 set / update)
     */
    find(id: string, type: SessionType): T | undefined {
        return this.findItem((item) => item.id === id && item.type === type);
    }

    /**
     * 设置某会话的配置
     *
     * 【必须】语义为"完全替换扩展字段": 传入的 config 未含某字段时, 该字段不会保留旧值,
     * 需要保留旧值时用 update。
     * @throws 校验失败时抛 Error (id 为空 / type 非法)
     */
    set(id: string, type: SessionType, config: Omit<T, 'id' | 'type'>): void {
        this.assertValidKey(id, type);

        const newItem = { id, type, ...config } as T;
        const updated = this.updateItem(
            (item) => item.id === id && item.type === type,
            () => newItem
        );
        if (!updated) this.addItem(newItem);
    }

    /**
     * 部分更新某会话的配置 (保留未提及的字段)
     * @throws 校验失败或记录不存在时抛 Error
     */
    update(id: string, type: SessionType, partial: Partial<Omit<T, 'id' | 'type'>>): void {
        this.assertValidKey(id, type);

        const updated = this.updateItem(
            (item) => item.id === id && item.type === type,
            (old) => ({ ...old, ...partial, id, type })
        );
        if (!updated) {
            throw new Error(`未找到会话配置: id=${id} type=${type}`);
        }
    }

    /**
     * 列出全部会话配置 (浅拷贝数组, 元素仍为内部引用)
     */
    list(): T[] {
        return [...this.getAll()];
    }

    /**
     * 删除某会话的配置
     * @returns 是否删除成功 (记录不存在时返回 false, 不抛错)
     */
    remove(id: string, type: SessionType): boolean {
        return this.removeItem((item) => item.id === id && item.type === type);
    }

    /**
     * 某会话是否已有配置
     */
    has(id: string, type: SessionType): boolean {
        return this.hasItem((item) => item.id === id && item.type === type);
    }

    // ==================== 内部 ====================

    /**
     * 定位字段校验: 尽早暴露开发者错误, 而非写出一条永远查不回来的脏数据
     */
    private assertValidKey(id: string, type: SessionType): void {
        if (!id) throw new Error('会话 id 不能为空');
        if (type !== 'private' && type !== 'group') {
            throw new Error(`会话 type 必须是 private 或 group, 收到: ${String(type)}`);
        }
    }
}
