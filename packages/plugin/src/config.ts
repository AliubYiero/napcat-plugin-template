/**
 * 插件配置模块
 *
 * 配置字段的权威源在 `shared/src/config.ts` 的 `FIELDS`:
 *   - 默认值由 `getDefaultConfig()` 派生
 *   - 清洗由 `sanitizeConfig()` 派生
 *   - 本文件只负责把 `FIELDS` 映射成 NapCat 原生面板 Schema (需要 ctx)
 */

import type { NapCatPluginContext, PluginConfigSchema } from 'napcat-types/napcat-onebot/network/plugin/types';
import { FIELDS, getDefaultConfig } from 'shared';
import type { PluginConfig } from './types';
import type { ConfigField } from 'shared';

/**
 * 默认配置 (从 FIELDS 派生)
 *
 * 默认值语义 (尤其启用开关的默认开启/关闭) 属于领域决策, 记入 CONTEXT.md。
 * 注意: 会话级配置 (群/私聊) 不属于本配置文件, 由 store 承载 (见 docs/store-pattern.md)。
 */
export const DEFAULT_CONFIG: PluginConfig = getDefaultConfig();

/**
 * 构建 NapCat 原生配置面板 Schema
 *
 * 遍历 shared 的 FIELDS, 按 kind 映射到 `ctx.NapCatConfig` 的构建器。
 * 【必须】新增配置项只需改 shared/src/config.ts (FIELDS), 此处无需改动。
 *
 *   - boolean(key, label, defaultValue?, description?)          → 开关
 *   - text(key, label, defaultValue?, description?)             → 文本输入
 *   - number(key, label, defaultValue?, description?)           → 数字输入
 *   - select(key, label, options, defaultValue?, description?)  → 下拉单选
 *   - multiSelect(key, label, options, defaultValue?, description?) → 下拉多选
 *   - html(content) / plainText(content)                        → 纯展示, 不保存值
 *   - combine(...items)                                         → 合并为 Schema
 */
export function buildConfigSchema(ctx: NapCatPluginContext): PluginConfigSchema {
    const items = FIELDS.map((field) => toNapCatItem(ctx, field));
    return ctx.NapCatConfig.combine(...items);
}

type NapCatConfigItem = PluginConfigSchema[number];

function toNapCatItem(
    ctx: NapCatPluginContext,
    field: ConfigField,
): NapCatConfigItem {
    const { NapCatConfig } = ctx;
    switch (field.kind) {
        case 'boolean':
            return NapCatConfig.boolean(field.key, field.label, field.default, field.description);
        case 'text':
            return NapCatConfig.text(field.key, field.label, field.default, field.description);
        case 'number':
            return NapCatConfig.number(field.key, field.label, field.default, field.description);
        case 'select':
            return NapCatConfig.select(
                field.key, field.label, [...field.options], field.default, field.description,
            );
        case 'multiSelect':
            return NapCatConfig.multiSelect(
                field.key, field.label, [...field.options], [...field.default], field.description,
            );
        case 'stringList':
            // 原生面板无列表控件: 降级为逗号分隔文本, 由清洗层转回数组
            return NapCatConfig.text(field.key, field.label, field.default.join(','), field.description);
        case 'section':
            // 仅布局: 分组标题
            return NapCatConfig.plainText(field.label);
        case 'display':
            return NapCatConfig.html(field.content);
    }
}
