/**
 * 连通性测试指令 handler (`<前缀> ping`)
 *
 * handler 内不做权限与作用域校验——门槛在注册表以 `requiredRole` / `scope`
 * 声明, 由分发层统一校验 (见 handlers/instruction-dispatch.ts)。
 */

import type { InstructionHandler } from '../instruction-registry';
import { sendReply } from '../utils';

export const pingHandler: InstructionHandler = async (ctx, event) => {
    await sendReply(ctx, event, 'pong!');
};
