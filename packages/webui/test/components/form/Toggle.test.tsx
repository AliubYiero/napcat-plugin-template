// @vitest-environment happy-dom
/**
 * Toggle 组件行为
 *
 * 合同: 受控开关; 切换回传 boolean; 支持无障碍名与禁用。
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Toggle from '../../../src/components/form/Toggle';

describe('Toggle', () => {
    it('反映当前值', () => {
        render(
            <Toggle
                checked
                onChange={vi.fn()}
                ariaLabel="示例开关"
            />,
        );
        expect(
            screen.getByRole('checkbox', { name: '示例开关' }),
        ).toBeChecked();
    });

    it('切换回传 boolean', () => {
        const onChange = vi.fn();
        render(<Toggle checked={false} onChange={onChange} />);
        fireEvent.click(screen.getByRole('checkbox'));
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('禁用时不触发变更', () => {
        const onChange = vi.fn();
        render(
            <Toggle checked={false} onChange={onChange} disabled />,
        );
        fireEvent.click(screen.getByRole('checkbox'));
        expect(onChange).not.toHaveBeenCalled();
    });
});
