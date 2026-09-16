/**
 * 消息接收入口 (接收层)
 *
 * 范式: docs/instruction-pattern.md 的 "一、接收层: handleMessage"
 * 职责固定为五步, 顺序不可调换:
 *   1. 群启用检查 → 2. 规范化 rawMessage → 3. 前缀检查 → 4. 切词 → 5. 分发
 *
 * 【必须】接收层不认识指令语义, 也**不做权限校验**——权限属于指令语义,
 * 由分发层统一处理 (见 instruction-dispatch)。
 * 【必须】整个函数包在 try/catch 中, 异常记日志不外抛: 它是所有消息事件的入口,
 * 异常外抛会影响插件宿主。
 */

import type { OB11Message } from 'napcat-types/napcat-onebot';
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { getUserRole } from '../core/admin';
import { pluginState } from '../core/state';
import { normalizeRawMessage } from '../utils/at-bot-prefix';
import { dispatch } from './instruction-dispatch';

/** selfId 缺失的 debug 日志只记一次, 避免每条消息刷屏 */
let warnedMissingSelfId = false;

/**
 * 消息处理主函数
 *
 * 各步的静默约定: 群未启用、前缀不匹配、未知指令、权限不足一律静默且不记日志;
 * 只有@机器人 剥离成功与 selfId 无效两种情况记 debug 日志。
 */
export async function handleMessage(ctx: NapCatPluginContext, event: OB11Message): Promise<void> {
    try {
        const rawMessage = event.raw_message || '';
        const { message_type, group_id } = event;

        // 1. 群启用检查: 先于规范化与前缀检查, 避免在禁用群里做无谓的字符串处理
        if (message_type === 'group' && group_id) {
            if (!pluginState.isGroupEnabled(String(group_id))) return;
        }

        // 2. 规范化: 按配置决定是否剥离开头 @机器人 的 CQ 段 (支持 @机器人 + 前缀指令)
        const allowAtBotTrigger = pluginState.config.allowAtBotTrigger;
        const trimmed = rawMessage.trim();
        const normalized = normalizeRawMessage(
            rawMessage,
            pluginState.selfId,
            allowAtBotTrigger
        );
        if (allowAtBotTrigger) {
            if (!pluginState.selfId && !warnedMissingSelfId) {
                warnedMissingSelfId = true;
                pluginState.logger.debug('机器人 QQ 号未知, 已跳过 @机器人 前缀剥离');
            } else if (normalized !== trimmed) {
                pluginState.logger.debug(
                    `剥离 @机器人 前缀: "${trimmed}" -> "${normalized}"`
                );
            }
        }

        // 3. 前缀检查: 不匹配是绝大多数消息的正常路径, 不回复、不记日志
        const prefix = pluginState.config.commandPrefix || '#cmd';
        if (!normalized.startsWith(prefix)) return;

        // 4. 切词: 去前缀后按空白切分, 空串会切出 [''], 由分发层的参数检查兜底
        const commands = normalized.slice(prefix.length).trim().split(/\s+/);

        // 5. 分发: 角色在入口一次性推导, 分发层与 handler 复用同一个 UserRole
        await dispatch(ctx, event, commands, getUserRole(event));
    } catch (error) {
        pluginState.logger.error('处理消息时出错:', error);
    }
}
