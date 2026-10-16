# generateHelp — 帮助产物生成

通过外部渲染服务 `napcat-help-generate` 生成帮助图片与文本, 落盘到本插件。

## 用法

```bash
pnpm run help:generate
```

## 权威源

- 每个帮助面板一个文件: `cmds/*.ts` (类型见 `cmd.ts`)。
- 修改帮助内容只改权威源, 重新执行生成; 产物 (`src/assets/*.png`、
  `src/handlers/*/helpText.generated.ts`) 一律禁止手改。
- 新增面板: 在 `cmds/` 建配置, 并在 `index.ts` 的 `CMD_TARGETS` 注册
  (cmd 配置 + 落盘 handler 目录)。

## 上游渲染服务

默认约定: 渲染服务与本仓库同级目录下的 `napcat-help-generate`。

路径与端口解析顺序:

- 服务目录: 环境变量 `HELP_GENERATOR_ROOT` → 同级 `napcat-help-generate`。
- 端口: 环境变量 `HELP_GENERATOR_PORT` → 上游 `.env` 的 `PORT` → `3366`。

服务未运行时脚本会自动在服务目录执行 `pnpm start` 并在结束后关闭本次自启的实例;
已在运行的实例会被复用且不会被关闭。

## 首次运行前提

1. 上游 `napcat-help-generate` 已完成 `pnpm install`。
2. 上游已安装浏览器内核: 在上游目录执行 `npx playwright install chromium`。
