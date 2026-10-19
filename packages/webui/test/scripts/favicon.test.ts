/**
 * 站点图标构建期纯函数
 *
 * 覆盖: 零/单/多文件、扩展名白名单、体积阈值、MIME、data URI 与占位替换。
 */

import {
    mkdirSync,
    mkdtempSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    FAVICON_MAX_BYTES,
    FAVICON_WARN_BYTES,
    FaviconBuildError,
    injectFavicon,
    scanFavicon,
} from '../../scripts/favicon';

const HTML = `<!DOCTYPE html>
<html>
<head>
    <title>demo</title>
    <link rel="icon" href="{{PLUGIN_FAVICON}}" vite-ignore />
</head>
</html>
`;

let tempDirs: string[] = [];

function createPublicDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'napcat-favicon-'));
    tempDirs.push(dir);
    return dir;
}

afterEach(() => {
    for (const dir of tempDirs) {
        rmSync(dir, { recursive: true, force: true });
    }
    tempDirs = [];
});

describe('scanFavicon', () => {
    it('目录不存在时返回 null', () => {
        expect(
            scanFavicon(join(createPublicDir(), 'missing')),
        ).toBeNull();
    });

    it('没有 favicon 文件时返回 null', () => {
        expect(scanFavicon(createPublicDir())).toBeNull();
    });

    it('只忽略目录, 不把 favicon.png 目录当图标', () => {
        const dir = createPublicDir();
        mkdirSync(join(dir, 'favicon.png'));
        expect(scanFavicon(dir)).toBeNull();
    });

    it('读取单个 SVG 并生成 data URI', () => {
        const dir = createPublicDir();
        writeFileSync(join(dir, 'favicon.svg'), '<svg></svg>');

        const favicon = scanFavicon(dir);

        expect(favicon).not.toBeNull();
        expect(favicon?.fileName).toBe('favicon.svg');
        expect(favicon?.mimeType).toBe('image/svg+xml');
        expect(
            favicon?.dataUri.startsWith('data:image/svg+xml;base64,'),
        ).toBe(true);
        expect(favicon?.warning).toBeUndefined();
    });

    it('ICO 映射为 image/x-icon', () => {
        const dir = createPublicDir();
        writeFileSync(
            join(dir, 'favicon.ico'),
            Buffer.from([0, 0, 1, 0]),
        );

        expect(scanFavicon(dir)?.mimeType).toBe('image/x-icon');
    });

    it('扩展名大小写不敏感', () => {
        const dir = createPublicDir();
        writeFileSync(
            join(dir, 'favicon.PNG'),
            Buffer.from([1, 2, 3]),
        );

        expect(scanFavicon(dir)?.mimeType).toBe('image/png');
    });

    it('多个 favicon 文件时构建失败并列出候选', () => {
        const dir = createPublicDir();
        writeFileSync(join(dir, 'favicon.ico'), Buffer.from([1]));
        writeFileSync(join(dir, 'favicon.svg'), '<svg></svg>');

        expect(() => scanFavicon(dir)).toThrow(FaviconBuildError);
        expect(() => scanFavicon(dir)).toThrow(
            /favicon\.ico.*favicon\.svg/,
        );
    });

    it('未知扩展名时构建失败', () => {
        const dir = createPublicDir();
        writeFileSync(join(dir, 'favicon.bmp'), Buffer.from([1]));

        expect(() => scanFavicon(dir)).toThrow(
            /不支持的 favicon 扩展名/,
        );
    });

    it('超过建议体积只警告', () => {
        const dir = createPublicDir();
        writeFileSync(
            join(dir, 'favicon.png'),
            Buffer.alloc(FAVICON_WARN_BYTES + 1),
        );

        const favicon = scanFavicon(dir);

        expect(favicon?.warning).toMatch(/超过建议值/);
    });

    it('超过硬性体积上限时构建失败', () => {
        const dir = createPublicDir();
        writeFileSync(
            join(dir, 'favicon.png'),
            Buffer.alloc(FAVICON_MAX_BYTES + 1),
        );

        expect(() => scanFavicon(dir)).toThrow(/超过上限/);
    });
});

describe('injectFavicon', () => {
    it('用内联 link 替换占位行并保留缩进', () => {
        const dir = createPublicDir();
        writeFileSync(join(dir, 'favicon.svg'), '<svg></svg>');

        const result = injectFavicon(HTML, dir);

        expect(result.html).not.toContain('{{PLUGIN_FAVICON}}');
        expect(result.html).toContain(
            '    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,',
        );
        expect(result.warning).toBeUndefined();
    });

    it('没有图标文件时移除整行', () => {
        const result = injectFavicon(HTML, createPublicDir());

        expect(result.html).not.toContain('{{PLUGIN_FAVICON}}');
        expect(result.html).not.toContain('rel="icon"');
        expect(result.html).toContain('<title>demo</title>');
    });

    it('把体积警告透传给调用方', () => {
        const dir = createPublicDir();
        writeFileSync(
            join(dir, 'favicon.png'),
            Buffer.alloc(FAVICON_WARN_BYTES + 1),
        );

        expect(injectFavicon(HTML, dir).warning).toMatch(
            /超过建议值/,
        );
    });

    it('缺少占位符时构建失败', () => {
        expect(() =>
            injectFavicon('<head></head>', createPublicDir()),
        ).toThrow(/缺少 \{\{PLUGIN_FAVICON\}\} 占位符/);
    });
});
