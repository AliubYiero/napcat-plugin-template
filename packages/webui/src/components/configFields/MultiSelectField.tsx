import type { MultiSelectFieldDescriptor } from 'shared';
import type { ValueFieldProps } from './types';

export default function MultiSelectField({
    field,
    value,
    onChange,
}: ValueFieldProps<
    MultiSelectFieldDescriptor,
    readonly (string | number)[]
>) {
    const toggle = (
        optionValue: string | number,
        checked: boolean,
    ) => {
        const selected = new Set(value);
        if (checked) selected.add(optionValue);
        else selected.delete(optionValue);
        // 按声明顺序回填, 保证与后端清洗结果一致
        onChange(
            field.options
                .map((o) => o.value)
                .filter((v) => selected.has(v)),
        );
    };

    return (
        <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                {field.label}
            </div>
            {field.description && (
                <div className="text-xs text-gray-400 mb-2">
                    {field.description}
                </div>
            )}
            <div className="flex flex-wrap gap-4">
                {field.options.map((option) => (
                    <label
                        key={String(option.value)}
                        className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                        <input
                            type="checkbox"
                            checked={value.includes(option.value)}
                            onChange={(e) =>
                                toggle(option.value, e.target.checked)
                            }
                        />
                        {option.label}
                    </label>
                ))}
            </div>
        </div>
    );
}
