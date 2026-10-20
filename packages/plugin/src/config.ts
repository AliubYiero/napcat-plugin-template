/**
 * 插件配置模块
 *
 * 配置字段的权威源在 `shared/src/config.ts` 的 `FIELDS`:
 *   - 默认值由 `getDefaultConfig()` 派生
 *   - 清洗由 `sanitizeConfig()` 派生
 *   - 本文件只负责把 `FIELDS` 映射成 NapCat 原生面板 Schema (需要 ctx)
 */

import type {
    NapCatPluginContext,
    PluginConfigSchema,
    PluginEntry,
} from 'napcat-types/napcat-onebot/network/plugin/types';
import type {
    ConfigField,
    DisplayTokenValues,
    SectionFieldDescriptor,
} from 'shared';
import {
    buildPasswordPanelHint,
    DEFAULT_PAGE,
    escapeHtml,
    FIELDS,
    getDefaultConfig,
    resolveDisplayContent,
} from 'shared';
import type { PluginConfig } from './types';

/**
 * 默认配置 (从 FIELDS 派生)
 *
 * 默认值语义 (尤其启用开关的默认开启/关闭) 属于领域决策, 记入 CONTEXT.md。
 * 注意: 会话级配置 (群/私聊) 不属于本配置文件, 由 store 承载 (见 docs/store-pattern.md)。
 */
export const DEFAULT_CONFIG: PluginConfig = getDefaultConfig();

/**
 * 分组标题样式
 *
 * html 字段会被直接注入宿主 DOM, 因此:
 *   - 类名统一加 `napcat-plugin-section-` 前缀 (style 是全局作用域);
 *   - 暗色用 `.dark` / `[data-theme="dark"]` 祖先选择器, 跟随 NapCat 面板
 *     的主题 class (宿主不读取 prefers-color-scheme, 也不会为本字符串生成
 *     Tailwind dark: 规则)。
 */
const SECTION_STYLE = `<style>
.napcat-plugin-section-title { display: flex; align-items: center; gap: 8px; margin: 0 0 2px; padding-top: 14px; border-top: 1px solid rgba(251,114,153,0.18); font-size: 14px; font-weight: 600; line-height: 20px; color: #b23a63; letter-spacing: .2px; }
.napcat-plugin-section-bar { width: 3px; height: 14px; border-radius: 2px; background: #fb7299; flex: 0 0 auto; }
.napcat-plugin-section-desc { margin: 0; font-size: 12px; line-height: 18px; color: #6b7280; }
.dark .napcat-plugin-section-title, [data-theme="dark"] .napcat-plugin-section-title { color: #f49ab5; }
.dark .napcat-plugin-section-desc, [data-theme="dark"] .napcat-plugin-section-desc { color: #9ca3af; }
</style>`;

/** 分组标题 HTML (置于样式块之外, 由 SECTION_STYLE 提供样式) */
export function buildSectionHtml(
    field: SectionFieldDescriptor,
): string {
    const description = field.description
        ? `<p class="napcat-plugin-section-desc">${escapeHtml(field.description)}</p>`
        : '';
    return `<div class="napcat-plugin-section"><div class="napcat-plugin-section-title"><span class="napcat-plugin-section-bar"></span><span>${escapeHtml(field.label)}</span></div>${description}</div>`;
}

/**
 * 构建 NapCat 原生配置面板 Schema
 *
 * 【必须】新增配置项只需改 shared/src/config.ts (FIELDS), 此处无需改动。
 * 签名保持 ctx-only; 需要注入字段的调用方 (测试) 用 buildConfigSchemaFromFields。
 */
export function buildConfigSchema(
    ctx: NapCatPluginContext,
): PluginConfigSchema {
    return buildConfigSchemaFromFields(ctx, FIELDS_ALL);
}

/**
 * 按给定字段构建原生面板 Schema (参数注入, 供测试注入合成字段)
 *
 * 遍历字段, 按 kind 映射到 `ctx.NapCatConfig` 的构建器。
 *
 *   - boolean(key, label, defaultValue?, description?)          → 开关
 *   - text(key, label, defaultValue?, description?)             → 文本输入
 *   - number(key, label, defaultValue?, description?)           → 数字输入
 *   - select(key, label, options, defaultValue?, description?)  → 下拉单选
 *   - multiSelect(key, label, options, defaultValue?, description?) → 下拉多选
 *   - html(content) / plainText(content)                        → 纯展示, 不保存值
 *   - combine(...items)                                         → 合并为 Schema
 *
 * 【例外】`password` 原生面板无密码控件: `scope` 为 `webui` 时本就不渲染
 *   (见下方 filter), `scope` 为 `both` 时改为渲染跳转引导块 (见 toNapCatItem)。
 *
 * 存在可见 section 时, 单份分组样式块作为首个 schema 项前置; 无 section 时
 * 面板保持原样 (开新项目删掉示例分组后不残留死样式)。
 */
export function buildConfigSchemaFromFields(
    ctx: NapCatPluginContext,
    fields: readonly ConfigField[],
): PluginConfigSchema {
    const values = getDisplayTokenValues(ctx);
    const visibleFields = fields.filter(
        (field) => field.scope !== 'webui',
    );
    const items = visibleFields.map((field) =>
        toNapCatItem(ctx, field, values),
    );
    const hasSection = visibleFields.some(
        (field) => field.kind === 'section',
    );
    return ctx.NapCatConfig.combine(
        ...(hasSection ? [ctx.NapCatConfig.html(SECTION_STYLE)] : []),
        ...items,
    );
}

/**
 * FIELDS 的遍历视图: 收窄为描述符统一类型
 * (as const 字面量元组不含未显式声明的可选属性如 scope)。
 */
const FIELDS_ALL: readonly ConfigField[] = FIELDS;

/**
 * 插件显示名 (package.json 的 `plugin` 字段)
 *
 * 【必须】显示名以 package.json 为唯一权威: 取宿主已解析的信息,
 * 回退链 `plugin` → `name` → 插件 id。拓展页标题与原生面板占位符共用本函数。
 */
export function getPluginDisplayName(
    ctx: NapCatPluginContext,
): string {
    const info = readPluginInfo(ctx);
    return info?.packageJson?.plugin ?? info?.name ?? ctx.pluginName;
}

/**
 * 汇总 display 占位符所需的值
 *
 * 插件名/描述取宿主已解析的 package.json (getPluginInfo), 拓展页地址由插件 id 拼装。
 */
function getDisplayTokenValues(
    ctx: NapCatPluginContext,
): DisplayTokenValues {
    const info = readPluginInfo(ctx);
    const pkg = info?.packageJson;
    return {
        pluginDisplayName: getPluginDisplayName(ctx),
        pluginDescription:
            pkg?.description ?? info?.description ?? '',
        extensionUrl: `/plugin/${ctx.pluginName}/page/dashboard`,
        extensionDashboardUrl: `/plugin/${ctx.pluginName}/page/dashboard#/${DEFAULT_PAGE}`,
    };
}

function readPluginInfo(
    ctx: NapCatPluginContext,
): PluginEntry | undefined {
    try {
        return ctx.pluginManager?.getPluginInfo?.(ctx.pluginName);
    } catch {
        return undefined;
    }
}

type NapCatConfigItem = PluginConfigSchema[number];

function toNapCatItem(
    ctx: NapCatPluginContext,
    field: ConfigField,
    values: DisplayTokenValues,
): NapCatConfigItem {
    const { NapCatConfig } = ctx;
    switch (field.kind) {
        case 'boolean':
            return NapCatConfig.boolean(
                field.key,
                field.label,
                field.default,
                field.description,
            );
        case 'text':
            return NapCatConfig.text(
                field.key,
                field.label,
                field.default,
                field.description,
            );
        case 'password':
            // 原生面板无密码控件: 渲染跳转引导块 (不落值), 引导用户去自建前端修改。
            // scope 为 webui 时已被 buildConfigSchema 过滤, 不会到达。
            return NapCatConfig.html(
                resolveDisplayContent(
                    buildPasswordPanelHint(
                        field.label,
                        field.description,
                    ),
                    values,
                ),
            );
        case 'number':
            return NapCatConfig.number(
                field.key,
                field.label,
                field.default,
                field.description,
            );
        case 'select':
            return NapCatConfig.select(
                field.key,
                field.label,
                [...field.options],
                field.default,
                field.description,
            );
        case 'multiSelect':
            return NapCatConfig.multiSelect(
                field.key,
                field.label,
                [...field.options],
                [...field.default],
                field.description,
            );
        case 'stringList':
            // 原生面板无列表控件: 降级为逗号分隔文本, 由清洗层转回数组
            return NapCatConfig.text(
                field.key,
                field.label,
                field.default.join(','),
                field.description,
            );
        case 'section':
            // 仅布局: 分组标题 (样式见 SECTION_STYLE)
            return NapCatConfig.html(buildSectionHtml(field));
        case 'display':
            // 解析 {{...}} 占位符后再交给原生面板渲染
            return NapCatConfig.html(
                resolveDisplayContent(field.content, values),
            );
    }
}
