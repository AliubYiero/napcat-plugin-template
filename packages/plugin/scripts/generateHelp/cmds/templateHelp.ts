import type { Cmd } from '../cmd.ts';

/**
 * 插件帮助面板权威源
 *
 * 修改帮助内容只改本文件, 再执行 `pnpm run help:generate` 重新生成
 * (产物 src/assets/*.png 与 handlers/commands/helpText.generated.ts 禁止手改)。
 *
 * 指令前缀写死在标题文本里 (生成产物是静态图片, 不随 COMMAND_PREFIX 运行时变化);
 * 修改 shared 的 COMMAND_PREFIX 后需同步本文件并重新生成帮助。
 */
export const templateHelp: Cmd = {
    id: 'template-help',
    title: 'NapCat 插件模板帮助',
    cmd: [
        {
            groupName: '核心指令',
            instructions: [
                { cmd: '#cmd ping', desc: '测试连通性' },
                { cmd: '#cmd status', desc: '查看运行状态' },
            ],
        },
        {
            groupName: '辅助指令',
            instructions: [
                { cmd: '#cmd help', desc: '显示帮助信息' },
            ],
        },
        // 需按权限分组时, 追加同名指令集并加 isAdmin / isSuperAdmin (两者互斥):
        // { groupName: '监听管理指令', isAdmin: true, instructions: [ ... ] },
        // { groupName: '监听管理指令', isSuperAdmin: true, instructions: [ ... ] },
        // 单条指令可用 onlyGroup / onlyPrivate (两者互斥) 限定会话类型。
    ],
};
