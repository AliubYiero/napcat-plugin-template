// @vitest-environment happy-dom
/**
 * SelectBox 组件行为
 *
 * 范式: docs/webui-config-pattern.md 的下拉选择 (单选 / 多选共用)。
 * 合同: 开合 / 外点关闭 / Escape; 单选回填标量并关面板;
 *       多选按 options 声明顺序回填; 胶囊可移除且不连带开合。
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { type ComponentProps, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import SelectBox, {
    type SelectBoxOption,
} from '../../../src/components/form/SelectBox';

const OPTIONS: readonly SelectBoxOption[] = [
    { label: '选项 A', value: 'a' },
    { label: '选项 B', value: 'b' },
    { label: '选项 C', value: 'c' },
];

/** 触发框: 唯一带 aria-haspopup="listbox" 的按钮 */
function getTrigger(): HTMLElement {
    return screen.getByRole('button', {
        name: (_name, element) =>
            element?.getAttribute('aria-haspopup') === 'listbox',
    });
}

function mockTriggerRect(
    trigger: HTMLElement,
    rect: Partial<DOMRect>,
) {
    return vi
        .spyOn(trigger, 'getBoundingClientRect')
        .mockReturnValue({
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: 0,
            height: 0,
            toJSON: () => ({}),
            ...rect,
        } as DOMRect);
}

function getPanel(): HTMLElement {
    return screen.getByRole('listbox').parentElement as HTMLElement;
}

function setup(
    props: Partial<ComponentProps<typeof SelectBox>> = {},
) {
    const onChange = vi.fn();
    render(
        <SelectBox
            label="示例单选"
            options={OPTIONS}
            value={[]}
            onChange={onChange}
            {...props}
        />,
    );
    return { onChange, trigger: getTrigger() };
}

describe('SelectBox', () => {
    it('空值显示默认 placeholder', () => {
        setup();
        expect(screen.getByText('请选择')).toBeInTheDocument();
    });

    it('可自定义 placeholder', () => {
        setup({ placeholder: '请选择项' });
        expect(screen.getByText('请选择项')).toBeInTheDocument();
    });

    it('单选已选显示 label', () => {
        setup({ value: ['b'] });
        expect(screen.getByText('选项 B')).toBeInTheDocument();
    });

    it('多选已选显示可移除的胶囊', () => {
        setup({ value: ['a', 'b'], multiple: true });
        expect(
            screen.getByRole('button', { name: '移除 选项 A' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: '移除 选项 B' }),
        ).toBeInTheDocument();
    });

    it('点触发框展开与收起', () => {
        setup();
        expect(getTrigger()).toHaveAttribute(
            'aria-expanded',
            'false',
        );
        fireEvent.click(getTrigger());
        expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
        fireEvent.click(getTrigger());
        expect(getTrigger()).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });

    it('键盘 Enter 展开, Escape 收起', () => {
        setup();
        fireEvent.keyDown(getTrigger(), { key: 'Enter' });
        expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
        fireEvent.keyDown(getTrigger(), { key: 'Escape' });
        expect(getTrigger()).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });

    it('点击组件外部收起', () => {
        setup();
        fireEvent.click(getTrigger());
        expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
        fireEvent.mouseDown(document.body);
        expect(getTrigger()).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });

    it('面板经 portal 挂载到 body', () => {
        const { trigger } = setup();
        fireEvent.click(trigger);
        const panel = getPanel();
        expect(panel.parentElement).toBe(document.body);
        expect(trigger.contains(panel)).toBe(false);
    });

    it('点面板内部不触发外点关闭', () => {
        const { trigger } = setup();
        fireEvent.click(trigger);
        fireEvent.mouseDown(
            screen.getByRole('option', { name: '选项 A' }),
        );
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('空间充足时向下定位并限制最大高度', () => {
        const { trigger } = setup();
        mockTriggerRect(trigger, {
            left: 40,
            width: 180,
            top: 100,
            bottom: 140,
        });
        fireEvent.click(trigger);
        const panel = getPanel();
        expect(panel.style.left).toBe('40px');
        expect(panel.style.width).toBe('180px');
        expect(panel.style.top).toBe('144px');
        expect(panel.style.bottom).toBe('');
        expect(panel.style.maxHeight).toBe('256px');
    });

    it('靠近视口底部时向上展开', () => {
        const { trigger } = setup();
        mockTriggerRect(trigger, {
            left: 100,
            width: 200,
            top: 600,
            bottom: 640,
        });
        fireEvent.click(trigger);
        const panel = getPanel();
        expect(panel.style.top).toBe('');
        expect(panel.style.bottom).toBe('172px');
        expect(panel.style.maxHeight).toBe('256px');
    });

    it('按可用空间夹紧 maxHeight', () => {
        const { trigger } = setup();
        mockTriggerRect(trigger, {
            top: 100,
            bottom: 600,
            width: 200,
        });
        fireEvent.click(trigger);
        expect(getPanel().style.maxHeight).toBe('164px');
    });

    it('内层滚动 (capture) 与 resize 后重新定位', () => {
        const { trigger } = setup();
        const rect = mockTriggerRect(trigger, {
            left: 10,
            width: 100,
            top: 100,
            bottom: 140,
        });
        fireEvent.click(trigger);
        expect(getPanel().style.top).toBe('144px');

        const scroller = document.createElement('div');
        document.body.appendChild(scroller);
        rect.mockReturnValue({
            x: 10,
            y: 200,
            left: 10,
            width: 100,
            top: 200,
            bottom: 240,
            right: 110,
            height: 40,
            toJSON: () => ({}),
        } as DOMRect);
        fireEvent.scroll(scroller);
        expect(getPanel().style.top).toBe('244px');

        rect.mockReturnValue({
            x: 10,
            y: 300,
            left: 10,
            width: 100,
            top: 300,
            bottom: 340,
            right: 110,
            height: 40,
            toJSON: () => ({}),
        } as DOMRect);
        fireEvent(window, new Event('resize'));
        expect(getPanel().style.top).toBe('344px');
        scroller.remove();
    });

    it('单选点选项回填标量并关面板', () => {
        const { onChange } = setup();
        fireEvent.click(getTrigger());
        fireEvent.click(
            screen.getByRole('option', { name: '选项 B' }),
        );
        expect(onChange).toHaveBeenCalledWith(['b']);
        expect(getTrigger()).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });

    it('aria-selected / aria-multiselectable 反映状态', () => {
        setup({ value: ['b'] });
        fireEvent.click(getTrigger());
        expect(
            screen.getByRole('option', { name: '选项 B' }),
        ).toHaveAttribute('aria-selected', 'true');
        expect(
            screen.getByRole('option', { name: '选项 A' }),
        ).toHaveAttribute('aria-selected', 'false');
        expect(screen.getByRole('listbox')).toHaveAttribute(
            'aria-multiselectable',
            'false',
        );
    });

    it('多选按 options 声明顺序回填 (非点击顺序)', () => {
        const onChange = vi.fn();
        function Harness() {
            const [value, setValue] = useState<(string | number)[]>(
                [],
            );
            return (
                <SelectBox
                    label="示例多选"
                    options={OPTIONS}
                    value={value}
                    multiple
                    onChange={(next) => {
                        onChange(next);
                        setValue(next);
                    }}
                />
            );
        }
        render(<Harness />);
        fireEvent.click(getTrigger());
        fireEvent.click(
            screen.getByRole('option', { name: '选项 C' }),
        );
        fireEvent.click(
            screen.getByRole('option', { name: '选项 A' }),
        );
        expect(onChange).toHaveBeenLastCalledWith(['a', 'c']);
    });

    it('多选点胶囊移除已选项且不连带开合', () => {
        const onChange = vi.fn();
        function Harness() {
            const [value, setValue] = useState<(string | number)[]>([
                'a',
                'b',
            ]);
            return (
                <SelectBox
                    label="示例多选"
                    options={OPTIONS}
                    value={value}
                    multiple
                    onChange={(next) => {
                        onChange(next);
                        setValue(next);
                    }}
                />
            );
        }
        render(<Harness />);
        fireEvent.click(
            screen.getByRole('button', { name: '移除 选项 A' }),
        );
        expect(onChange).toHaveBeenCalledWith(['b']);
        expect(getTrigger()).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });
});
