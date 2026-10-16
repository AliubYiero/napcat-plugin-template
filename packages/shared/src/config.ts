/**
 * 插件配置「单一声明源」
 *
 * 这里是配置的唯一权威定义: 一份字段描述符 (FIELDS) 同时驱动
 *   - 类型     `PluginConfig`
 *   - 默认值   `getDefaultConfig()`
 *   - 清洗     `sanitizeConfig()` (含逗号列表 codec)
 *   - 后端面板 plugin 的 `buildConfigSchema` 把 FIELDS 映射到 `ctx.NapCatConfig`
 *   - 前端表单 webui 的 `ConfigForm` 按 kind 渲染对应控件
 *
 * 【必须】新增/修改配置项时只改本文件: 在 `PluginConfig` 加字段, 在 `FIELDS` 加同 key 描述符。
 * 二者用 `satisfies` 绑定键集, 不一致时编辑器报错 (键集一致性另有单测兜底)。
 *
 * 会话级配置 (群/好友) 不属于本文件, 由 store 承载 (见 docs/store-pattern.md)。
 */

// ==================== 字段描述符类型 ====================

/** select / multiSelect 的候选项 */
export interface ConfigOption {
    label: string;
    value: string | number;
}

/**
 * 有值字段的 kind: 每类对应一条清洗规则、一个后端控件、一个前端控件。
 *
 * | kind          | 清洗                       | 后端控件     | 前端控件     |
 * | ------------- | -------------------------- | ------------ | ------------ |
 * | boolean       | typeof 守卫, 回退默认      | 开关         | 开关         |
 * | text          | typeof 守卫, 回退默认      | 文本框       | 文本框       |
 * | number        | typeof + 区间, 回退默认    | 数字框       | 数字框       |
 * | select        | 必须命中 options, 否则默认 | 下拉单选     | 下拉单选     |
 * | multiSelect   | 过滤非法值, 空数组合法     | 下拉多选     | 复选         |
 * | stringList    | 逗号串/数组 → 去空项数组   | 逗号文本框   | 逗号文本框   |
 */
export type ValueFieldKind =
    | 'boolean'
    | 'text'
    | 'number'
    | 'select'
    | 'multiSelect'
    | 'stringList';

/** 全部 kind (含仅布局/展示、不落盘的字段) */
export type ConfigFieldKind = ValueFieldKind | 'section' | 'display';

interface FieldBase {
    /** 展示标签 */
    label: string;
    /** 说明文字 */
    description?: string;
}

export interface BooleanFieldDescriptor extends FieldBase {
    kind: 'boolean';
    default: boolean;
}

export interface TextFieldDescriptor extends FieldBase {
    kind: 'text';
    default: string;
    placeholder?: string;
}

export interface NumberFieldDescriptor extends FieldBase {
    kind: 'number';
    default: number;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
}

export interface SelectFieldDescriptor extends FieldBase {
    kind: 'select';
    default: string | number;
    options: readonly ConfigOption[];
}

export interface MultiSelectFieldDescriptor extends FieldBase {
    kind: 'multiSelect';
    default: readonly (string | number)[];
    options: readonly ConfigOption[];
}

export interface StringListFieldDescriptor extends FieldBase {
    kind: 'stringList';
    default: readonly string[];
    placeholder?: string;
}

export type ValueFieldDescriptor =
    | BooleanFieldDescriptor
    | TextFieldDescriptor
    | NumberFieldDescriptor
    | SelectFieldDescriptor
    | MultiSelectFieldDescriptor
    | StringListFieldDescriptor;

/** 仅布局/展示, 不落盘, 无 key */
export interface SectionFieldDescriptor extends FieldBase {
    kind: 'section';
}

export interface DisplayFieldDescriptor extends FieldBase {
    kind: 'display';
    /** 展示用 HTML 片段 */
    content: string;
}

/** 带 key 的有值字段 (key 必须是 PluginConfig 的键) */
export type ConfigValueField = ValueFieldDescriptor & {
    key: keyof PluginConfig;
};

/** 布局/展示字段 */
export type ConfigLayoutField =
    | SectionFieldDescriptor
    | DisplayFieldDescriptor;

/** 描述符统一类型 */
export type ConfigField = ConfigValueField | ConfigLayoutField;

// ==================== 配置接口 ====================

/**
 * 插件主配置接口
 *
 * 字段集必须与 `FIELDS` 完全一致 (由 satisfies 与单测双重保证)。
 */
export interface PluginConfig {
    /** 全局开关：是否启用插件功能 */
    enabled: boolean;
    /** 触发命令前缀，默认为 #cmd */
    commandPrefix: string;
    /**
     * 是否允许 `@机器人 + 前缀指令` 触发，默认开启。
     * 关闭后仅识别以 commandPrefix 开头的消息。
     */
    allowAtBotTrigger: boolean;
    /**
     * 超级管理员 QQ 号名单（四档角色中唯一需要人工配置的档位）。
     * WebUI 中以英文逗号分隔输入，清洗后始终是数组。
     */
    adminUsers: string[];
    // TODO: 在这里添加你的插件配置项 (同时在 FIELDS 添加同 key 描述符)
}

// ==================== 字段声明 ====================

/**
 * 配置字段声明 (唯一权威)
 *
 * 【必须】每项必须声明一个可渲染的 base kind (后端面板据此渲染);
 * 自定义前端交互用 webui 的覆盖注册表实现, 不改变这里的 kind。
 * `key` 会被校验为 PluginConfig 的键; 布局字段 (section/display) 不带 key。
 */
export const FIELDS = [
    {
        key: 'enabled',
        kind: 'boolean',
        label: '启用插件',
        description: '全局开关，关闭后不会响应任何命令',
        default: true,
    },
    {
        key: 'allowAtBotTrigger',
        kind: 'boolean',
        label: '@机器人 触发',
        description: '开启后 @机器人 + 前缀指令也可触发',
        default: true,
    },
    {
        key: 'commandPrefix',
        kind: 'text',
        label: '命令前缀',
        description: '触发命令的前缀',
        default: '#cmd',
    },
    {
        key: 'adminUsers',
        kind: 'stringList',
        label: '超级管理员 QQ',
        description: '多个 QQ 号用英文逗号分隔；超管不受会话类型限制',
        default: [],
    },
    // TODO: 在这里添加你的配置项
    // 可选 kind: boolean / text / number / select / multiSelect / stringList
    //            section (分组标题) / display (纯展示, content 为 HTML)
] as const satisfies readonly ConfigField[];

// 编译期断言: FIELDS 的有值字段键集与 PluginConfig 键集完全一致 (编辑器可见)
type FieldKeys = Extract<
    (typeof FIELDS)[number],
    { key: string }
>['key'];
type KeysInSync = [keyof PluginConfig] extends [FieldKeys]
    ? [FieldKeys] extends [keyof PluginConfig]
        ? true
        : never
    : never;
const _assertKeysInSync: KeysInSync = true;
void _assertKeysInSync;

// ==================== 派生: 默认值 ====================

/** 从 FIELDS 派生默认配置 (每次返回全新对象, 数组已复制) */
export function getDefaultConfig(): PluginConfig {
    const out: Record<string, unknown> = {};
    for (const field of FIELDS) {
        if (!('key' in field)) continue;
        out[field.key] = cloneValue(
            (field as ConfigValueField).default,
        );
    }
    return out as unknown as PluginConfig;
}

function cloneValue(value: unknown): unknown {
    return Array.isArray(value) ? [...value] : value;
}

// ==================== 派生: 清洗 ====================

/**
 * 配置清洗函数 (纯函数)
 *
 * 【必须】一切外部输入的配置写回都必须经过本函数 (磁盘配置文件、WebUI 提交、
 * 指令修改)。规则从 FIELDS 的 kind 派生, 不再逐字段手写:
 *
 * | kind        | 规则                                                  |
 * | ----------- | ----------------------------------------------------- |
 * | boolean     | typeof 守卫; 不合法保留默认值                          |
 * | text        | typeof 守卫; 不合法保留默认值                          |
 * | number      | typeof + 区间钳制; 不合法回退默认值                    |
 * | select      | 必须命中 options 的 value; 否则回退默认值              |
 * | multiSelect | 过滤非法值; **空数组是合法语义**, 不回退默认值          |
 * | stringList  | 容错输入格式 (逗号串 / 数组), 统一转为去空项数组        |
 *
 * 【必须】清洗不抛错: 任何非法输入都回退默认值或丢弃条目, 保证插件在损坏的
 * 配置文件下仍能启动。
 */
export function sanitizeConfig(raw: unknown): PluginConfig {
    const source = isPlainObject(raw) ? raw : {};
    const out: Record<string, unknown> = {};
    for (const field of FIELDS) {
        if (!('key' in field)) continue;
        out[field.key] = sanitizeValue(
            field as ConfigValueField,
            source[field.key],
        );
    }
    return out as unknown as PluginConfig;
}

function sanitizeValue(
    field: ConfigValueField,
    value: unknown,
): unknown {
    switch (field.kind) {
        case 'boolean':
            return typeof value === 'boolean' ? value : field.default;
        case 'text':
            return typeof value === 'string' ? value : field.default;
        case 'number': {
            if (
                typeof value !== 'number' ||
                !Number.isFinite(value)
            ) {
                return field.default;
            }
            let result = value;
            if (typeof field.min === 'number')
                result = Math.max(result, field.min);
            if (typeof field.max === 'number')
                result = Math.min(result, field.max);
            return result;
        }
        case 'select':
            return field.options.some(
                (option) => option.value === value,
            )
                ? value
                : field.default;
        case 'multiSelect': {
            if (!Array.isArray(value)) return [...field.default];
            return value.filter((item) =>
                field.options.some((option) => option.value === item),
            );
        }
        case 'stringList':
            return decodeStringList(value, field.default);
    }
}

/**
 * stringList codec: 逗号分隔文本 → 去空项数组
 *
 * 与 webui 的标签/文本框输入共用, 是前后端一致的唯一定义。
 * 【限制】不支持含逗号的值 (QQ 号等场景不含逗号)。
 */
export function parseStringList(input: string): string[] {
    return input
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

function decodeStringList(
    value: unknown,
    fallback: readonly string[],
): string[] {
    if (typeof value === 'string') return parseStringList(value);
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item).trim())
            .filter((item) => item.length > 0);
    }
    return [...fallback];
}

function isPlainObject(
    value: unknown,
): value is Record<string, unknown> {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
    );
}
