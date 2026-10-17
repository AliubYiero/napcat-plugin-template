# CLAUDE.md — NapCat 插件开发模板

NapCat 插件开发模板 (pnpm monorepo), 基于实际生产项目架构提炼。开发范式体系见 [docs/index.md](docs/index.md); 领域术语见 [CONTEXT.md](CONTEXT.md)。写代码/起名前先读这两处。

## 仓库结构

- `packages/plugin` — 插件后端发布物: 生命周期入口 `index.ts`、配置 `config.ts`、类型 `types.ts`、全局状态单例 `core/state.ts`、权限模块 `core/admin.ts`、`store/` (通用基类 `BaseStore` / `SessionConfigStore` 与会话配置子类 `PluginSessionConfigStore`)、`services/` (`session-config.service.ts` 会话配置单一入口、`api-service.ts` WebUI API 路由)、`handlers/` (接收层 → 注册表 → 分发层 → `commands/` 执行层 + 发送工具 `utils.ts`)、纯函数 `utils/at-bot-prefix.ts`。
- `packages/plugin/test` — vitest 单测, 与 `src/` 下的纯函数模块一一对应 (构建配置见 `vitest.config.ts`)。
- `packages/webui` — React SPA 前端 (vite + tailwind), 独立构建; 配置表单为声明式自动渲染 (`components/ConfigForm.tsx` + `components/config-fields/`); 帮助文档页 `pages/HelpPage.tsx` (消费 `GET /help` 返回的 `HELP_PANELS`, 多面板 Tab + 搜索)。
- `packages/shared` — 跨包共享层: `config.ts` (配置单一声明源 `FIELDS` + `PluginConfig` + `COMMAND_PREFIX` + 默认值/清洗派生 + 字段可见范围 `scope`)、`display-tokens.ts` (展示块 `{{...}}` 占位符常量与解析纯函数 `resolveDisplayContent`)、`ui.ts` (WebUI 骨架元信息 `PAGES`) 与 `help.ts` (帮助面板类型 `Cmd` 等, 与上游 `napcat-help-generate` 手工同步), 以及会话级/API 类型 (plugin 的 types.ts 从此处重导出)。
- `docs/` — 开发范式文档体系, 入口 [docs/index.md](docs/index.md)。
- `.example/` — NapCat 官方插件开发文档 (外部参考资料)。

## 构建与验证

- `pnpm build` (根) — 构建 plugin 与 webui (vite, 含资源复制)。**纯构建**: 热部署插件只在 `--mode deploy` 下挂载, 因此 build 不连调试服务。
- `pnpm run test` (根) — plugin 的 vitest 单测 (`packages/plugin/test/`), 覆盖范式里的纯函数模块。
- `pnpm run deploy` / `pnpm run dev` — 热部署链路 (构建后自动复制到远程并重载), 需 NapCat 端启用 `napcat-plugin-debug`。
- 验证以 **vite build** 与 **vitest** 为准; 类型校验走 `pnpm typecheck` (根, 即 `pnpm -r typecheck`), 或 `pnpm check` (= typecheck + test)。
- `pnpm typecheck` 只检查**本项目代码**: napcat-types 只发布裸 `.ts` (零 `.d.ts`, 且依赖未发布的 `napcat-protobuf`), 不是可独立编译单元, 直接引入会让 tsc 深入其源码树并大量报错。故 `packages/plugin/tsconfig.json` 用 `paths` 把 `napcat-types/*` 重定向到本地类型垫片 `packages/plugin/types/napcat-types/` (插件框架类型为 0.0.16 的信实副本, OneBot 消息类型族退化为 `any`), 第三方内部被隔离在类型检查之外。垫片为手工抄录, 升级 napcat-types 时需对照同名文件手动同步; 唯一以「值」使用的 `EventType` 已自持于 `packages/plugin/src/onebot-event.ts`, 故插件对 napcat-types 无运行时/构建依赖。

## 本项目实例化

本仓库是通用模板; 范式文档正文零项目引用, 项目实例仅出现在各范式文档末尾"参考实现"一节:

- [store-pattern](docs/store-pattern.md) → `store/BaseStore.ts` (通用列表型存储基类)、`store/SessionConfigStore.ts` (会话级配置基类) 与 `store/plugin-session-config.store.ts` (会话配置具体子类 `PluginSessionConfigStore`); 会话配置的单一读写入口 `services/session-config.service.ts`; 全局状态单例 `core/state.ts` (`pluginState` 的 `loadDataFile` / `saveDataFile` 是基类的持久化底座)。具体业务 store 按该范式建子类, 单例与延迟实例化由子类实现。
- [config-pattern](docs/config-pattern.md) → 字段描述符、`PluginConfig`、默认值与清洗派生见 `packages/shared/src/config.ts`; 后端原生面板 Schema 映射见 `config.ts` 的 `buildConfigSchema`; 运行时读写 (读盘清洗、`replaceConfig` / `updateConfig`) 见 `core/state.ts` (`sanitizeConfig` 由此 re-export)。会话级配置 (群/好友) **不**在此链路, 由 store 承载。
- [webui-config-pattern](docs/webui-config-pattern.md) → 声明源 `packages/shared/src/config.ts` (`FIELDS` / `getDefaultConfig` / `sanitizeConfig` / `parseStringList` / `scope`)、`packages/shared/src/display-tokens.ts` (`resolveDisplayContent`) 与 `packages/shared/src/ui.ts` (`PAGES` / `DEFAULT_PAGE`); 后端映射 (含 scope 过滤与占位符解析) `packages/plugin/src/config.ts`; 前端渲染 `packages/webui/src/components/ConfigForm.tsx` + `components/config-fields/` + `pages/StatusPage.tsx` (仪表盘页内嵌配置表单); 骨架消费 `webui/src/App.tsx` 与 `components/Sidebar.tsx`; 插件身份构建期注入见 `webui/vite.config.ts` / `utils/api.ts`。
- [permission-pattern](docs/permission-pattern.md) → `core/admin.ts` (`UserRole` / `ROLE_LEVEL` / `getUserRole` / `hasRole` / `isAdmin` / `isGroupAdminRole` / `isBotAdmin` / `isSuperAdmin`) 与 `adminUsers` 配置链。
- [instruction-pattern](docs/instruction-pattern.md) → `handlers/message-handler.ts` (接收层五步)、`handlers/instruction-registry.ts` (注册表)、`handlers/instruction-dispatch.ts` (分发层与不对称反馈)、`handlers/commands/` (执行层)、`utils/at-bot-prefix.ts` (@机器人 剥离)。
- [message-send-pattern](docs/message-send-pattern.md) → `handlers/utils.ts` (四个发送函数 + 8 个消息段工厂 + @全体成员 `sendAtAll` / `getAtAllQuota`)。
- [help-output-pattern](docs/help-output-pattern.md) → `packages/plugin/scripts/generateHelp/` (cmd 权威源 `cmds/`、生成入口 `index.ts` 与 `CMD_TARGETS`、用法见该目录 `README.md`)、运行时工具 `utils/helpMessage.ts` (`getHelpVariant` / `sendHelpMessage`)、消费方 `handlers/commands/help.handler.ts` 与产物 `handlers/commands/helpText.generated.ts`; 结构化产物 `handlers/help/helpData.generated.ts` (`HELP_PANELS`, 供 WebUI `pages/HelpPage.tsx` 经 `GET /help` 消费); 图片由外部项目 `napcat-help-generate` 渲染成 `src/assets/*.png` (`pnpm run help:generate` 产出, 产物入库)。

以本模板开新项目时: 复制 `CONTEXT.md` 与本文件的骨架, 按新项目领域填充术语与实例索引; 范式文档保持通用, 不写回项目细节。
