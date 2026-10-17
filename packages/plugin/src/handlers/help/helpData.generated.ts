/**
 * 由 pnpm run help:generate 生成, 禁止手改
 * cmd 权威源: scripts/generateHelp/cmds/
 * 供 WebUI 帮助文档页消费 (GET /help)
 */

import type { Cmd } from 'shared';

/** 全部帮助面板 (内容为各 cmds 权威源原样, 未经权限过滤) */
export const HELP_PANELS: Cmd[] = [
    {
        "id": "template-help",
        "title": "NapCat 插件模板帮助",
        "cmd": [
            {
                "groupName": "核心指令",
                "instructions": [
                    {
                        "cmd": "#cmd ping",
                        "desc": "测试连通性"
                    },
                    {
                        "cmd": "#cmd status",
                        "desc": "查看运行状态"
                    }
                ]
            },
            {
                "groupName": "辅助指令",
                "instructions": [
                    {
                        "cmd": "#cmd help",
                        "desc": "显示帮助信息"
                    }
                ]
            }
        ]
    }
];
