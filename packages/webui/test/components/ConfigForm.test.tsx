// @vitest-environment happy-dom
/**
 * ConfigForm 组件行为
 *
 * 范式: docs/webui-config-pattern.md 的声明式配置表单。
 * 合同: 按 FIELDS 的 section 切成多张卡片; 每张卡按 kind 渲染控件;
 *       过滤 scope='panel'; 布局 / 展示字段不落盘; onChange 冒泡字段 key;
 *       overrides 按 key 覆盖。
 */

import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { getDefaultConfig } from 'shared';
import { describe, expect, it, vi } from 'vitest';
import ConfigForm, {
    type FieldRenderProps,
} from '../../src/components/ConfigForm';

function renderForm(
    overrides?: Record<string, ComponentType<FieldRenderProps>>,
) {
    const onChange = vi.fn();
    const { container } = render(
        <ConfigForm
            config={getDefaultConfig()}
            onChange={onChange}
            overrides={overrides}
        />,
    );
    return { onChange, container };
}

describe('ConfigForm', () => {
    it('按 section 切成两张卡片并保持顺序', () => {
        const { container } = renderForm();
        expect(container.querySelectorAll('.card')).toHaveLength(2);
        expect(
            screen
                .getAllByRole('heading', { level: 3 })
                .map((heading) => heading.textContent),
        ).toEqual(['基础配置', '示例字段']);
    });

    it('渲染 section 的 description 作为卡片副标题', () => {
        renderForm();
        expect(
            screen.getByText(
                '演示各 kind 的呈现; 开新项目后请连同本分组删除 (本行即 section 的 description)',
            ),
        ).toBeInTheDocument();
    });

    it('按 kind 渲染各字段控件', () => {
        renderForm();
        expect(screen.getByText('示例开关')).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText('请输入文本'),
        ).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText('请输入密钥'),
        ).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText('输入 QQ 号后按回车添加'),
        ).toBeInTheDocument();
        expect(screen.getByText('指令触发方式')).toBeInTheDocument();
    });

    it('过滤 scope=panel 的仅原生面板字段', () => {
        renderForm();
        expect(screen.queryByText(/跳转至拓展页面/)).toBeNull();
    });

    it('卡片标题不触发 onChange', () => {
        const { onChange } = renderForm();
        expect(screen.getByText('基础配置')).toBeInTheDocument();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('控件变更冒泡字段 key', () => {
        const { onChange } = renderForm();
        fireEvent.click(screen.getByRole('checkbox'));
        expect(onChange).toHaveBeenCalledWith('exampleBoolean', true);
    });

    it('overrides 按 key 覆盖渲染', () => {
        const Override = ({ value }: FieldRenderProps) => (
            <div data-testid="override">{String(value)}</div>
        );
        renderForm({ exampleText: Override });
        expect(screen.getByTestId('override')).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText('请输入文本'),
        ).toBeNull();
    });
});
