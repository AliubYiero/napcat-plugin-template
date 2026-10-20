interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    /** 无可见文字标签时提供无障碍名 */
    ariaLabel?: string;
    className?: string;
}

/**
 * 通用开关控件
 *
 * 复用 `.toggle` 外观 (见 index.css); 配置表单与业务页面共用,
 * 避免各自手写 `<label className="toggle">`。
 */
export default function Toggle({
    checked,
    onChange,
    disabled = false,
    ariaLabel,
    className,
}: ToggleProps) {
    return (
        <label
            className={`toggle${className ? ` ${className}` : ''}`}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                aria-label={ariaLabel}
                onChange={(event) => onChange(event.target.checked)}
            />
            <div className="slider" />
        </label>
    );
}
