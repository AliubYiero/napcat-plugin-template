// @vitest-environment happy-dom
/**
 * Checkbox 组件行为
 *
 * 合同: 受控勾选框; 切换回传 boolean; 支持无障碍名与禁用。
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Checkbox from '../../../src/components/form/Checkbox';

describe('Checkbox', () => {
    it('反映当前值', () => {
        render(
            <Checkbox checked onChange={vi.fn()} ariaLabel="全选" />,
        );
        expect(
            screen.getByRole('checkbox', { name: '全选' }),
        ).toBeChecked();
    });

    it('切换回传 boolean', () => {
        const onChange = vi.fn();
        render(<Checkbox checked={false} onChange={onChange} />);
        fireEvent.click(screen.getByRole('checkbox'));
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('禁用时不触发变更', () => {
        const onChange = vi.fn();
        render(
            <Checkbox checked={false} onChange={onChange} disabled />,
        );
        fireEvent.click(screen.getByRole('checkbox'));
        expect(onChange).not.toHaveBeenCalled();
    });
});
