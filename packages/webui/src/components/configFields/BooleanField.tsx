import type { BooleanFieldDescriptor } from 'shared';
import Toggle from '../form/Toggle';
import type { ValueFieldProps } from './types';

export default function BooleanField({
    field,
    value,
    onChange,
}: ValueFieldProps<BooleanFieldDescriptor, boolean>) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {field.label}
                </div>
                {field.description && (
                    <div className="text-xs text-gray-400 mt-0.5">
                        {field.description}
                    </div>
                )}
            </div>
            <Toggle checked={value} onChange={onChange} />
        </div>
    );
}
