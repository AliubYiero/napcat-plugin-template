/**
 * 展示块 (display) 占位符「单一声明源」
 *
 * display 字段的 `content` 是 ctx-free 静态 HTML; 其中的动态值以 `{{TOKEN}}` 形式声明,
 * 由前后端各自在可得处解析:
 *   - 后端: 原生面板渲染前, 用 ctx 的插件信息 (ctx.pluginManager.getPluginInfo)
 *   - 前端: 自建前端渲染前, 用构建期注入的插件身份
 *
 * 语法统一为 `{{...}}` (webui 的 index.html 构建期占位符亦改用同一拼写)。
 * 【必须】未命中的 token 回退空串; 注入值做 HTML 转义, 防止破坏展示块结构。
 */

/** 插件显示名 (package.json 的 `plugin` 字段) */
export const PLUGIN_DISPLAY_NAME_TOKEN = '{{PLUGIN_DISPLAY_NAME}}';
/** 插件描述 (package.json 的 `description` 字段) */
export const PLUGIN_DESCRIPTION_TOKEN = '{{PLUGIN_DESCRIPTION}}';
/** 插件拓展页面地址 (指向自建前端, 形如 /plugin/<id>/page/dashboard) */
export const EXTENSION_URL_TOKEN = '{{EXTENSION_URL}}';

/** 解析 display content 所需的值; 缺失时以空串回退 */
export interface DisplayTokenValues {
    pluginDisplayName?: string;
    pluginDescription?: string;
    extensionUrl?: string;
}

/** HTML 转义, 供注入展示块的值使用 */
export function escapeHtml(value: string): string {
    return value
        .split('&')
        .join('&amp;')
        .split('<')
        .join('&lt;')
        .split('>')
        .join('&gt;')
        .split('"')
        .join('&quot;')
        .split("'")
        .join('&#39;');
}

/**
 * 解析 display content 中的占位符 (纯函数)
 *
 * 【必须】未命中或值为空的 token 一律回退空串; 注入值经 HTML 转义。
 */
export function resolveDisplayContent(
    content: string,
    values: DisplayTokenValues,
): string {
    const replacements: ReadonlyArray<[string, string]> = [
        [
            PLUGIN_DISPLAY_NAME_TOKEN,
            escapeHtml(values.pluginDisplayName ?? ''),
        ],
        [
            PLUGIN_DESCRIPTION_TOKEN,
            escapeHtml(values.pluginDescription ?? ''),
        ],
        [EXTENSION_URL_TOKEN, escapeHtml(values.extensionUrl ?? '')],
    ];
    let resolved = content;
    for (const [token, value] of replacements) {
        resolved = resolved.split(token).join(value);
    }
    return resolved;
}
