/**
 * 帮助指令 handler (`<前缀> help`)
 *
 * 本模板使用静态帮助文本。若帮助内容需要按角色输出不同版本
 * (User / Admin / SuperAdmin), 或需要渲染成图片, 见
 * docs/help-output-pattern.md 的完整流水线:
 * 权威源 → 生成脚本 → 产物落盘 → 运行时变体选择与文本回退。
 */

import { pluginState } from '../../core/state';
import type { InstructionHandler } from '../instruction-registry';
import { sendReply } from '../utils';

export const helpHandler: InstructionHandler = async (ctx, event) => {
    // 前缀读自配置, 运行期生效
    const prefix = pluginState.config.commandPrefix;
    const lines = [
        '[= 插件帮助 =]',
        `${prefix} help   - 显示帮助信息`,
        `${prefix} ping   - 测试连通性`,
        `${prefix} status - 查看运行状态`,
    ];
    await sendReply(ctx, event, lines.join('\n'));
};
