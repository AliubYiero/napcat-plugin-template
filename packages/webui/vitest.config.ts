import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * 单测配置
 *
 * 与 vite.config.ts (构建配置) 分开: 构建配置带单文件内联与插件身份注入,
 * 不适合测试期加载。
 *
 * 纯函数测试跑在 node 环境 (本文件默认); 组件测试在文件顶部用
 * `// @vitest-environment happy-dom` 按文件覆盖 (见 test/PasswordField.test.tsx)。
 * 组件 (tsx) 需要 @vitejs/plugin-react 做 JSX 转换, 故此处挂 react 插件。
 */
export default defineConfig({
    plugins: [react()],
    resolve: {
        // 与 vite.config.ts 保持一致的条件解析顺序
        conditions: ['node', 'default'],
    },
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    },
});
