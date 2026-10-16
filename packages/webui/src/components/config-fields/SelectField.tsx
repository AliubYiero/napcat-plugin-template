import type { SelectFieldDescriptor } from 'shared';
import type { ValueFieldProps } from './types';

export default function SelectField({
    field,
    value,
    onChange,
}: ValueFieldProps<SelectFieldDescriptor, string | number>) {
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
            <select
                className="input-field"
                value={String(value)}
                onChange={(e) => {
                    const option = field.options.find(
                        (o) => String(o.value) === e.target.value,
                    );
                    if (option) onChange(option.value);
                }}
            >
                {field.options.map((option) => (
                    <option
                        key={String(option.value)}
                        value={String(option.value)}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
