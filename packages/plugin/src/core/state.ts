/**
 * 全局状态管理模块（单例模式）
 *
 * 封装插件的配置持久化和运行时状态，提供在项目任意位置访问
 * ctx、config、logger 等对象的能力，无需逐层传递参数。
 *
 * 使用方法：
 *   import { pluginState } from '../core/state';
 *   pluginState.config.enabled;       // 读取配置
 *   pluginState.ctx.logger.info(...); // 使用日志
 */

import fs from 'fs';
import path from 'path';
import type { NapCatPluginContext, PluginLogger } from 'napcat-types/napcat-onebot/network/plugin/types';
import { DEFAULT_CONFIG } from '../config';
import type { PluginConfig, GroupConfig } from '../types';

// ==================== 配置清洗工具 ====================

function isObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * 配置清洗函数
 *
 * 【必须】一切外部输入的配置写回都必须经过本函数 (磁盘配置文件、WebUI 提交、
 * 指令修改)。外部输入包括磁盘配置文件、WebUI 提交、指令修改。
 * 【必须】清洗不抛错: 任何非法输入都回退默认值或丢弃条目, 保证插件在损坏的
 * 配置文件下仍能启动。按字段形态分五类:
 *
 * | 形态       | 规则                                                    |
 * | ---------- | ------------------------------------------------------- |
 * | 标量       | typeof 守卫; 不合法则保留默认值, 不报错                  |
 * | 数值       | typeof + 业务区间校验 (如 `> 0`); 不合法回退默认值       |
 * | 字符串列表 | 容错输入格式, 统一转为规范形态后去空项                   |
 * | 枚举数组   | 过滤非法值; **空数组是合法语义**, 不回退默认值           |
 * | 嵌套对象   | 逐字段递归使用上述规则; 整体不合法则丢弃该条目           |
 */
export function sanitizeConfig(raw: unknown): PluginConfig {
    if (!isObject(raw)) return { ...DEFAULT_CONFIG, groupConfigs: {} };

    const out: PluginConfig = { ...DEFAULT_CONFIG, groupConfigs: {} };

    // 标量: typeof 守卫, 不合法保留默认
    if (typeof raw.enabled === 'boolean') out.enabled = raw.enabled;
    if (typeof raw.commandPrefix === 'string') out.commandPrefix = raw.commandPrefix;
    if (typeof raw.allowAtBotTrigger === 'boolean') {
        out.allowAtBotTrigger = raw.allowAtBotTrigger;
    }

    // 字符串列表: 容错输入格式 (WebUI 传入逗号分隔串, 配置文件内是数组),
    // 统一转为规范形态后去空项。超管名单在清洗阶段一次性解析, 运行期不再解析。
    if (typeof raw.adminUsers === 'string') {
        out.adminUsers = raw.adminUsers
            .split(',')
            .map((id) => id.trim())
            .filter((id) => id.length > 0);
    } else if (Array.isArray(raw.adminUsers)) {
        out.adminUsers = raw.adminUsers
            .map((id) => String(id).trim())
            .filter((id) => id.length > 0);
    }

    // 群配置清洗
    if (isObject(raw.groupConfigs)) {
        for (const [groupId, groupConfig] of Object.entries(raw.groupConfigs)) {
            if (isObject(groupConfig)) {
                const cfg: GroupConfig = {};
                if (typeof groupConfig.enabled === 'boolean') cfg.enabled = groupConfig.enabled;
                // TODO: 在这里添加你的群配置项清洗
                out.groupConfigs[groupId] = cfg;
            }
        }
    }

    // TODO: 在这里添加你的配置项清洗逻辑

    return out;
}

// ==================== 插件全局状态类 ====================

class PluginState {
    /** NapCat 插件上下文（init 后可用） */
    private _ctx: NapCatPluginContext | null = null;

    /** 插件配置 */
    config: PluginConfig = { ...DEFAULT_CONFIG };

    /** 插件启动时间戳 */
    startTime: number = 0;

    /** 机器人自身 QQ 号 */
    selfId: string = '';

    /** 活跃的定时器 Map: jobId -> NodeJS.Timeout */
    timers: Map<string, ReturnType<typeof setInterval>> = new Map();

    /** 运行时统计 */
    stats = {
        processed: 0,
        todayProcessed: 0,
        lastUpdateDay: new Date().toDateString(),
    };

    /** 获取上下文（确保已初始化） */
    get ctx(): NapCatPluginContext {
        if (!this._ctx) throw new Error('PluginState 尚未初始化，请先调用 init()');
        return this._ctx;
    }

    /** 获取日志器的快捷方式 */
    get logger(): PluginLogger {
        return this.ctx.logger;
    }

    // ==================== 生命周期 ====================

    /**
     * 初始化（在 plugin_init 中调用）
     */
    init(ctx: NapCatPluginContext): void {
        this._ctx = ctx;
        this.startTime = Date.now();
        this.loadConfig();
        this.ensureDataDir();
        this.fetchSelfId();
    }

    /**
     * 获取机器人自身 QQ 号（异步，init 时自动调用）
     */
    private async fetchSelfId(): Promise<void> {
        try {
            const res = await this.ctx.actions.call(
                'get_login_info', {}, this.ctx.adapterName, this.ctx.pluginManager.config
            ) as { user_id?: number | string };
            if (res?.user_id) {
                this.selfId = String(res.user_id);
                this.logger.debug("(｡·ω·｡) 机器人 QQ: " + this.selfId);
            }
        } catch (e) {
            this.logger.warn("(；′⌒`) 获取机器人 QQ 号失败:", e);
        }
    }

    /**
     * 清理（在 plugin_cleanup 中调用）
     */
    cleanup(): void {
        // 清理所有定时器
        for (const [jobId, timer] of this.timers) {
            clearInterval(timer);
            this.logger.debug(`(｡-ω-) 清理定时器: ${jobId}`);
        }
        this.timers.clear();
        this.saveConfig();
        this._ctx = null;
    }

    // ==================== 数据目录 ====================

    /** 确保数据目录存在 */
    private ensureDataDir(): void {
        const dataPath = this.ctx.dataPath;
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
        }
    }

    /** 获取数据文件完整路径 */
    getDataFilePath(filename: string): string {
        return path.join(this.ctx.dataPath, filename);
    }

    // ==================== 通用数据文件读写 ====================

    /**
     * 读取 JSON 数据文件
     * 常用于订阅数据、定时任务配置、推送历史等持久化数据
     * @param filename 数据文件名（如 'subscriptions.json'）
     * @param defaultValue 文件不存在或解析失败时的默认值
     */
    loadDataFile<T>(filename: string, defaultValue: T): T {
        const filePath = this.getDataFilePath(filename);
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
        } catch (e) {
            this.logger.warn("(；′⌒`) 读取数据文件 " + filename + " 失败:", e);
        }
        return defaultValue;
    }

    /**
     * 保存 JSON 数据文件
     * @param filename 数据文件名
     * @param data 要保存的数据
     * @param space 保存文件的空白符
     */
    saveDataFile<T>( filename: string, data: T, space: number = 0): void {
        const filePath = this.getDataFilePath(filename);
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, space), 'utf-8');
        } catch (e) {
            this.logger.error("(╥﹏╥) 保存数据文件 " + filename + " 失败:", e);
        }
    }

    // ==================== 配置管理 ====================

    /**
     * 从磁盘加载配置
     */
    loadConfig(): void {
        const configPath = this.ctx.configPath;
        try {
            if (configPath && fs.existsSync(configPath)) {
                const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                this.config = sanitizeConfig(raw);
                // 加载统计信息
                if (isObject(raw) && isObject(raw.stats)) {
                    Object.assign(this.stats, raw.stats);
                }
                this.ctx.logger.debug('已加载本地配置');
            } else {
                this.config = { ...DEFAULT_CONFIG, groupConfigs: {} };
                this.saveConfig();
                this.ctx.logger.debug('配置文件不存在，已创建默认配置');
            }
        } catch (error) {
            this.ctx.logger.error('加载配置失败，使用默认配置:', error);
            this.config = { ...DEFAULT_CONFIG, groupConfigs: {} };
        }
    }

    /**
     * 保存配置到磁盘
     */
    saveConfig(): void {
        if (!this._ctx) return;
        const configPath = this._ctx.configPath;
        try {
            const configDir = path.dirname(configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            const data = { ...this.config, stats: this.stats };
            fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            this._ctx.logger.error('保存配置失败:', error);
        }
    }

    /**
     * 合并更新配置
     *
     * 【必须】仅限内部可信调用方使用 (字段已被上游清洗或来自 DEFAULT_CONFIG)。
     * 来源不可信时 (WebUI 提交、指令修改、直接读盘) 一律走 replaceConfig,
     * 由它统一清洗。
     */
    updateConfig(partial: Partial<PluginConfig>): void {
        this.config = { ...this.config, ...partial };
        this.saveConfig();
    }

    /**
     * 完整替换配置 (入口统一清洗后再保存)
     */
    replaceConfig(config: PluginConfig): void {
        this.config = sanitizeConfig(config);
        this.saveConfig();
    }

    /**
     * 更新指定群的配置
     */
    updateGroupConfig(groupId: string, config: Partial<GroupConfig>): void {
        this.config.groupConfigs[groupId] = {
            ...this.config.groupConfigs[groupId],
            ...config,
        };
        this.saveConfig();
    }

    /**
     * 检查群是否启用（默认启用，除非明确设置为 false）
     */
    isGroupEnabled(groupId: string): boolean {
        return this.config.groupConfigs[groupId]?.enabled !== false;
    }

    // ==================== 统计 ====================

    /**
     * 增加处理计数
     */
    incrementProcessed(): void {
        const today = new Date().toDateString();
        if (this.stats.lastUpdateDay !== today) {
            this.stats.todayProcessed = 0;
            this.stats.lastUpdateDay = today;
        }
        this.stats.todayProcessed++;
        this.stats.processed++;
    }

    // ==================== 工具方法 ====================

    /** 获取运行时长（毫秒） */
    getUptime(): number {
        return Date.now() - this.startTime;
    }

    /** 获取格式化的运行时长 */
    getUptimeFormatted(): string {
        const ms = this.getUptime();
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        const d = Math.floor(h / 24);

        if (d > 0) return `${d}天${h % 24}小时`;
        if (h > 0) return `${h}小时${m % 60}分钟`;
        if (m > 0) return `${m}分钟${s % 60}秒`;
        return `${s}秒`;
    }
}

/** 导出全局单例 */
export const pluginState = new PluginState();
