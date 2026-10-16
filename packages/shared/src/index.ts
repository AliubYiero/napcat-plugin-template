/**
 * 共享类型定义
 * 插件后端（plugin）与 WebUI 前端（webui）共用的接口和类型。
 * 修改此文件后两端类型同步生效，无需手动维护两份定义。
 */

// ==================== 插件配置 ====================

/**
 * 插件主配置接口
 * 在此定义你的插件所需的所有配置项
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
     * WebUI 中以英文逗号分隔输入，经 sanitizeConfig 清洗后始终是数组。
     */
    adminUsers: string[];
    // TODO: 在这里添加你的插件配置项
}

// ==================== 会话级配置 ====================

/**
 * 会话类型：群聊或私聊，与消息事件的 message_type 同域
 */
export type SessionType = 'private' | 'group';

/**
 * 会话配置项必须携带的定位字段，业务字段由具体 store 的泛型补充。
 * 会话级配置不放在插件配置文件里，而是由 store 承载（见 docs/store-pattern.md）。
 */
export interface SessionConfigBase {
    /** 群号或用户 QQ 号 */
    id: string;
    /** 会话类型 */
    type: SessionType;
}

/**
 * 会话级配置
 *
 * 启用开关为宽松判定取反：默认关闭（严格 `enabled === true` 才启用），
 * 未记录或未写 `enabled` 一律视为禁用。
 */
export interface SessionConfig extends SessionConfigBase {
    /** 是否启用此会话的功能，默认关闭 */
    enabled?: boolean;
    // TODO: 在这里添加会话级别的配置项
}

// ==================== API 响应 ====================

/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T = unknown> {
    /** 状态码，0 表示成功，-1 表示失败 */
    code: number;
    /** 错误信息（仅错误时返回） */
    message?: string;
    /** 响应数据（仅成功时返回） */
    data?: T;
}
