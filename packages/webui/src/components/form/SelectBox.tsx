import {
    type CSSProperties,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { IconCheck, IconChevronDown } from '../Icons';
import Chip from './Chip';

export interface SelectBoxOption {
    label: string;
    value: string | number;
}

interface SelectBoxProps {
    label: string;
    description?: string;
    options: readonly SelectBoxOption[];
    /** 已选值 (单选 0..1 项; 多选 0..n 项), 顺序无关 */
    value: readonly (string | number)[];
    multiple?: boolean;
    placeholder?: string;
    onChange: (next: (string | number)[]) => void;
}

/** 面板与触发框的间距 */
const PANEL_GAP = 4;
/** 面板最大高度 (16rem), 实际高度再按视口可用空间夹紧 */
const PANEL_MAX_HEIGHT = 256;

interface PanelPosition {
    left: number;
    width: number;
    maxHeight: number;
    top?: number;
    bottom?: number;
}

/**
 * 下拉选择框 (单选 / 多选共用)
 *
 * 结构对齐 WebUI 其它自建控件: 标题 / 描述 / 控件 纵向排列, 标题不放进框内。
 * 触发框复用 `.input-field` 外观 + 右侧箭头; 点开弹出 listbox, 选项右侧带勾选标记
 * (下拉交互对齐 NapCat 原生面板的 select)。多选在同一面板内勾选,
 * 触发框以胶囊展示已选项 (点胶囊 X 直接移除), 提交顺序按 options 声明顺序回填
 * (与后端清洗结果一致)。
 *
 * 面板经 portal 挂到 body 并使用 fixed 定位, 以脱离卡片堆叠上下文与
 * `main` 的 overflow 裁剪; 靠近视口底部时向上展开, 高度按可用空间夹紧。
 */
export default function SelectBox({
    label,
    description,
    options,
    value,
    multiple = false,
    placeholder = '请选择',
    onChange,
}: SelectBoxProps) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState<PanelPosition | null>(
        null,
    );
    const triggerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const spaceBelow =
            window.innerHeight - rect.bottom - PANEL_GAP;
        const spaceAbove = rect.top - PANEL_GAP;
        const openUp =
            spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow;
        const maxHeight = Math.max(
            0,
            Math.min(
                PANEL_MAX_HEIGHT,
                openUp ? spaceAbove : spaceBelow,
            ),
        );

        setPosition(
            openUp
                ? {
                      left: rect.left,
                      width: rect.width,
                      bottom:
                          window.innerHeight - rect.top + PANEL_GAP,
                      maxHeight,
                  }
                : {
                      left: rect.left,
                      width: rect.width,
                      top: rect.bottom + PANEL_GAP,
                      maxHeight,
                  },
        );
    }, []);

    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();

        const onScroll = (event: Event) => {
            // 面板自身滚动无需重新锚定
            if (panelRef.current?.contains(event.target as Node)) {
                return;
            }
            updatePosition();
        };
        const onResize = () => updatePosition();

        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                triggerRef.current?.contains(target) ||
                panelRef.current?.contains(target)
            ) {
                return;
            }
            setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const selectedOptions = options.filter((option) =>
        value.includes(option.value),
    );
    const filled = selectedOptions.length > 0;

    const select = (optionValue: string | number) => {
        if (multiple) {
            const selected = new Set(value);
            if (selected.has(optionValue))
                selected.delete(optionValue);
            else selected.add(optionValue);
            onChange(
                options
                    .map((option) => option.value)
                    .filter((v) => selected.has(v)),
            );
        } else {
            onChange([optionValue]);
            setOpen(false);
        }
    };

    const panelStyle: CSSProperties = position
        ? {
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              ...(position.top !== undefined
                  ? { top: position.top }
                  : { bottom: position.bottom }),
          }
        : { visibility: 'hidden' };

    return (
        <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                {label}
            </div>
            {description && (
                <div className="text-xs text-gray-400 mb-2">
                    {description}
                </div>
            )}
            {/* biome-ignore lint/a11y/useSemanticElements: 触发框内含 Chip 删除按钮, 原生 <button> 不允许嵌套按钮 */}
            <div
                ref={triggerRef}
                role="button"
                tabIndex={0}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((prev) => !prev)}
                onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setOpen((prev) => !prev);
                    } else if (event.key === 'Escape') {
                        setOpen(false);
                    }
                }}
                className="input-field flex items-center justify-between gap-2 cursor-pointer text-left"
            >
                <span className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                    {filled ? (
                        multiple ? (
                            selectedOptions.map((option) => (
                                <Chip
                                    key={String(option.value)}
                                    label={option.label}
                                    onRemove={() =>
                                        select(option.value)
                                    }
                                />
                            ))
                        ) : (
                            <span className="truncate">
                                {selectedOptions[0].label}
                            </span>
                        )
                    ) : (
                        <span className="text-gray-400">
                            {placeholder}
                        </span>
                    )}
                </span>
                <IconChevronDown
                    size={16}
                    className={`flex-shrink-0 transition-transform duration-150 ${
                        open ? 'rotate-180' : ''
                    }`}
                />
            </div>

            {open &&
                createPortal(
                    <div
                        ref={panelRef}
                        style={panelStyle}
                        className="fixed z-[60] p-1 overflow-y-auto bg-white dark:bg-[#1e1e20] border border-gray-100 dark:border-gray-800 rounded-lg shadow-lg animate-scale-in"
                    >
                        <div
                            role="listbox"
                            aria-multiselectable={multiple}
                            className="flex flex-col gap-0.5 outline-none"
                        >
                            {options.map((option) => {
                                const selected = value.includes(
                                    option.value,
                                );
                                return (
                                    <button
                                        key={String(option.value)}
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        onClick={() =>
                                            select(option.value)
                                        }
                                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border-none bg-transparent"
                                    >
                                        <span className="flex-1 truncate">
                                            {option.label}
                                        </span>
                                        {selected && (
                                            <IconCheck
                                                size={14}
                                                className="flex-shrink-0 text-primary"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
