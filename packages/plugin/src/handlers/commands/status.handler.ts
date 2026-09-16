/**
 * 运行状态指令 handler (`<前缀> status`)
 *
 * 演示分发层推导出的 `UserRole` 在 handler 内的复用: 角色与来源会话都取自
 * 入口一次性推导的结果, 不重复解析 event.sender。
 */

import type { UserRoleName } from '../../core/admin';
import { pluginState } from '../../core/state';
import type { InstructionHandler } from '../instruction-registry';
import { sendReply } from '../utils';

/** 角色档位的中文展示名 (与四档模型一一对应) */
const ROLE_LABEL: Record<UserRoleName, string> = {
    user: '普通用户',
    admin: '群管理员',
    privateUser: '好友',
    superAdmin: '超级管理员',
};

export const statusHandler: InstructionHandler = async (ctx, event, commands, userRole) => {
    const lines = [
        '[= 插件状态 =]',
        `运行时长: ${pluginState.getUptimeFormatted()}`,
        `今日处理: ${pluginState.stats.todayProcessed}`,
        `总计处理: ${pluginState.stats.processed}`,
        `当前身份: ${ROLE_LABEL[userRole.role]}`,
    ];
    await sendReply(ctx, event, lines.join('\n'));
};
