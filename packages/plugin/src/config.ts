/**
 * 插件配置模块
 * 定义默认配置值和 WebUI 配置 Schema
 */

import type { NapCatPluginContext, PluginConfigSchema } from 'napcat-types/napcat-onebot/network/plugin/types';
import type { PluginConfig } from './types';

/**
 * 默认配置
 *
 * 【必须】新增配置项时四处同步: 类型 (shared/src/index.ts 的 PluginConfig /
 * GroupConfig) → 本处默认值 → buildConfigSchema → sanitizeConfig (core/state.ts)。
 * 默认值语义 (尤其启用开关的默认开启/关闭) 属于领域决策, 记入 CONTEXT.md。
 */
export const DEFAULT_CONFIG: PluginConfig = {
    enabled: true,
    commandPrefix: '#cmd',
    // 默认开启: 升级后 `[CQ:at,qq=机器人] #指令` 会开始触发, 属于行为变更
    allowAtBotTrigger: true,
    // 超级管理员名单, 默认空 (无人拥有超管档位)
    adminUsers: [],
    groupConfigs: {},
    // TODO: 在这里添加你的默认配置值
};

/**
 * 构建 WebUI 配置 Schema
 *
 * 使用 ctx.NapCatConfig 提供的构建器方法生成配置界面：
 *   - boolean(key, label, defaultValue?, description?, reactive?)  → 开关
 *   - text(key, label, defaultValue?, description?, reactive?)     → 文本输入
 *   - number(key, label, defaultValue?, description?, reactive?)   → 数字输入
 *   - select(key, label, options, defaultValue?, description?)     → 下拉单选
 *   - multiSelect(key, label, options, defaultValue?, description?) → 下拉多选
 *   - html(content)     → 自定义 HTML 展示（不保存值）
 *   - plainText(content) → 纯文本说明
 *   - combine(...items)  → 组合多个配置项为 Schema
 */
export function buildConfigSchema(ctx: NapCatPluginContext): PluginConfigSchema {
    return ctx.NapCatConfig.combine(
        // 插件信息头部
        // ctx.NapCatConfig.html(`
        //     <div style="padding: 16px; background: #FB7299; border-radius: 12px; margin-bottom: 20px; color: white;">
        //         <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 600;">插件模板</h3>
        //         <p style="margin: 0; font-size: 13px; opacity: 0.85;">NapCat 插件开发模板，请根据需要修改配置</p>
        //     </div>
        // `),
        // 全局开关
        ctx.NapCatConfig.boolean('enabled', '启用插件', true, '是否启用此插件的功能'),
        // 命令前缀（修改后立即生效，无需重启）
        ctx.NapCatConfig.text(
            'commandPrefix',
            '命令前缀',
            '#cmd',
            '触发命令的前缀，默认为 #cmd'
        ),
        // @机器人 触发（默认开启）
        ctx.NapCatConfig.boolean(
            'allowAtBotTrigger',
            '@机器人 触发',
            true,
            '开启后 @机器人 + 前缀指令也可触发；关闭后仅前缀指令可触发'
        ),
        // 超级管理员名单（文本控件收集到的是字符串，由 sanitizeConfig 转数组）
        ctx.NapCatConfig.text(
            'adminUsers',
            '超级管理员 QQ',
            '',
            '多个 QQ 号用英文逗号分隔；超管不受会话类型限制'
        ),
        // TODO: 在这里添加你的配置项
    );
}
