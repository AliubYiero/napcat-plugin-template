/**
 * `@机器人` CQ 段剥离 (纯函数模块)
 *
 * 范式: docs/instruction-pattern.md 的 "1.1 @机器人 CQ 段剥离"
 *
 * 本模块只负责剥离, 不负责整体 trim()、trimStart(), 也不产生日志副作用——
 * 编排与日志由接收层 (handlers/message-handler.ts) 承担。
 */

/** 消息开头第一个 at CQ 段 (CQ 标记大小写不敏感, 属性部分整体捕获) */
const LEADING_AT_SEGMENT = /^\[CQ:at,([^\]]*)\]/i;

/**
 * qq 属性匹配:
 * - 属性顺序不限 (从属性串任意 `,` 处起匹配)
 * - 值可带双引号、单引号或无引号
 * - 允许额外属性 (如 `name=...`)
 */
const QQ_ATTRIBUTE = /(?:^|,)\s*qq\s*=\s*(?:"([^"]*)"|'([^']*)'|([^,]*))/i;

/**
 * 剥离消息开头第一个匹配 selfId 的 at CQ 段
 *
 * - 【必须】只剥离开头**第一个** at 段, 其他 at 段保留不动
 * - 【必须】qq 值必须精确等于 selfId 的字符串形式
 * - 【必须】selfId 缺失/为空时跳过剥离, 原样返回, 不抛异常
 *
 * @param rawMessage 原始消息文本
 * @param selfId 机器人自身 QQ 号 (取自 PluginState.selfId, 不硬编码)
 * @returns 剥离后的字符串 (未剥离则为原串)
 */
export function stripAtBotPrefix(rawMessage: string, selfId: string): string {
    if (!rawMessage || !selfId) return rawMessage;

    const segment = rawMessage.match(LEADING_AT_SEGMENT);
    if (!segment) return rawMessage;

    const matched = QQ_ATTRIBUTE.exec(segment[1]);
    const qq = (matched?.[1] ?? matched?.[2] ?? matched?.[3] ?? '').trim();
    if (qq !== String(selfId)) return rawMessage;

    return rawMessage.slice(segment[0].length);
}

/**
 * 接收层规范化编排: `trim()` → 剥离 at 段 → `trimStart()`
 *
 * 【必须】`allowAtBotTrigger` 为 false 时**完全跳过规范化步骤**
 * (不整体 trim()、不剥离、不 trimStart()), `rawMessage` 原样进入前缀检查。
 * 此时 `[CQ:at,qq=...] #cmd` 会因不以 commandPrefix 开头而静默返回。
 *
 * @param rawMessage 原始消息文本
 * @param selfId 机器人自身 QQ 号
 * @param allowAtBotTrigger 是否允许 @机器人 触发 (读自配置)
 */
export function normalizeRawMessage(
    rawMessage: string,
    selfId: string,
    allowAtBotTrigger: boolean
): string {
    if (!allowAtBotTrigger) return rawMessage;
    return stripAtBotPrefix(rawMessage.trim(), selfId).trimStart();
}
