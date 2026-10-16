/**
 * 由 pnpm run help:generate 生成, 禁止手改
 * cmd 权威源: scripts/generateHelp/cmds/template-help.ts
 */

import type { HelpVariant } from '../../utils/helpMessage';

/** 按帮助版本的文本帮助 (图片降级用), Admin 版同时用于私聊用户与群聊超管 */
export const HELP_TEXT_MAP: Record<HelpVariant, string> = {
    user: "【NapCat 插件模板帮助】\n\n核心指令:\n#cmd ping: 测试连通性\n#cmd status: 查看运行状态\n\n辅助指令:\n#cmd help: 显示帮助信息\n",
    admin: "【NapCat 插件模板帮助】\n\n核心指令:\n#cmd ping: 测试连通性\n#cmd status: 查看运行状态\n\n辅助指令:\n#cmd help: 显示帮助信息\n",
    superAdmin: "【NapCat 插件模板帮助】\n\n核心指令:\n#cmd ping: 测试连通性\n#cmd status: 查看运行状态\n\n辅助指令:\n#cmd help: 显示帮助信息\n",
};
