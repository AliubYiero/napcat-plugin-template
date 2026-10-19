/**
 * 站点图标 (favicon) 的构建期扫描与内联
 *
 * 声明源: `packages/webui/public/favicon.*` (恰好一个文件)
 * 产物: 内联为 data URI 写入 index.html
 *
 * 不能在 HTML 里写相对路径: NapCat 插件页地址是
 * `/plugin/<pluginId>/page/<name>`, 没有尾斜杠也没有 `<base>`,
 * `./favicon.svg` 会被解析到 `/plugin/<id>/page/favicon.svg` 并返回 404。
 */

import {
    existsSync,
    readdirSync,
    readFileSync,
    statSync,
} from 'node:fs';
import { extname, join } from 'node:path';

/** 图标文件基名, 实际文件形如 favicon.svg */
export const FAVICON_BASE_NAME = 'favicon';

/** 建议体积上限: 超过仅警告 */
export const FAVICON_WARN_BYTES = 64 * 1024;

/** 硬性体积上限: 超过即构建失败 */
export const FAVICON_MAX_BYTES = 256 * 1024;

/** 支持的扩展名与对应 MIME */
export const FAVICON_MIME_TYPES: Readonly<Record<string, string>> = {
    svg: 'image/svg+xml',
    png: 'image/png',
    ico: 'image/x-icon',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
};

/** index.html 中的占位符 */
export const FAVICON_PLACEHOLDER = '{{PLUGIN_FAVICON}}';

const FAVICON_LINK_PATTERN =
    /^([ \t]*)<link\b[^>]*\{\{PLUGIN_FAVICON\}\}[^>]*>[ \t]*\r?\n?/m;

export class FaviconBuildError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FaviconBuildError';
    }
}

export interface FaviconFile {
    /** 源文件名, 如 favicon.ico */
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    dataUri: string;
    /** 体积超过建议值时的提示 */
    warning?: string;
}

export interface FaviconInjection {
    html: string;
    warning?: string;
}

function formatSize(bytes: number): string {
    return `${(bytes / 1024).toFixed(1)}KB`;
}

/**
 * 扫描 public 目录并读取唯一图标文件。
 *
 * 目录不存在或没有 favicon.* 时返回 null (不输出图标);
 * 多个文件、未知扩展名、超过硬性体积上限时抛出 FaviconBuildError。
 */
export function scanFavicon(publicDir: string): FaviconFile | null {
    if (!existsSync(publicDir)) {
        return null;
    }

    const candidates = readdirSync(publicDir, { withFileTypes: true })
        .filter(
            (entry) =>
                entry.isFile() &&
                entry.name
                    .toLowerCase()
                    .startsWith(`${FAVICON_BASE_NAME}.`),
        )
        .map((entry) => entry.name);

    if (candidates.length === 0) {
        return null;
    }

    if (candidates.length > 1) {
        throw new FaviconBuildError(
            `public 目录下只能有一个 favicon 文件, 当前找到: ${candidates.sort().join(', ')}`,
        );
    }

    const [fileName] = candidates;
    if (!fileName) {
        return null;
    }

    const ext = extname(fileName).slice(1).toLowerCase();
    const mimeType = FAVICON_MIME_TYPES[ext];

    if (!mimeType) {
        throw new FaviconBuildError(
            `不支持的 favicon 扩展名: .${ext || '(无)'}; 支持: ${Object.keys(FAVICON_MIME_TYPES).join(', ')}`,
        );
    }

    const filePath = join(publicDir, fileName);
    const sizeBytes = statSync(filePath).size;

    if (sizeBytes > FAVICON_MAX_BYTES) {
        throw new FaviconBuildError(
            `favicon 体积 ${formatSize(sizeBytes)} 超过上限 ${formatSize(FAVICON_MAX_BYTES)} (${fileName})`,
        );
    }

    const dataUri = `data:${mimeType};base64,${readFileSync(filePath).toString('base64')}`;
    const warning =
        sizeBytes > FAVICON_WARN_BYTES
            ? `favicon 体积 ${formatSize(sizeBytes)} 超过建议值 ${formatSize(FAVICON_WARN_BYTES)} (${fileName})`
            : undefined;

    return { fileName, mimeType, sizeBytes, dataUri, warning };
}

/** 生成最终写入 HTML 的 link 标签 */
export function buildFaviconLink(favicon: FaviconFile): string {
    return `<link rel="icon" type="${favicon.mimeType}" href="${favicon.dataUri}" />`;
}

/**
 * 把 index.html 中的占位 link 替换为内联图标。
 *
 * 没有图标文件时移除整行; 占位符缺失视为模板错误。
 */
export function injectFavicon(
    html: string,
    publicDir: string,
): FaviconInjection {
    if (!FAVICON_LINK_PATTERN.test(html)) {
        throw new FaviconBuildError(
            `packages/webui/index.html 缺少 ${FAVICON_PLACEHOLDER} 占位符`,
        );
    }

    const favicon = scanFavicon(publicDir);
    const nextHtml = html.replace(
        FAVICON_LINK_PATTERN,
        (_match: string, indent: string) =>
            favicon ? `${indent}${buildFaviconLink(favicon)}\n` : '',
    );

    return { html: nextHtml, warning: favicon?.warning };
}
