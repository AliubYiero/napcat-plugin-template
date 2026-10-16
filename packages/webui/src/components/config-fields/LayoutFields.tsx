import type {
    DisplayFieldDescriptor,
    SectionFieldDescriptor,
} from 'shared';

/** 分组标题 (仅布局, 不落盘) */
export function SectionField({
    field,
}: {
    field: SectionFieldDescriptor;
}) {
    return (
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 pt-2">
            {field.label}
        </div>
    );
}

/** 纯展示块 (仅展示, 不落盘) */
export function DisplayField({
    field,
}: {
    field: DisplayFieldDescriptor;
}) {
    return (
        <div
            className="text-xs text-gray-400"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: 内容由插件作者在 FIELDS 中声明, 视为可信
            dangerouslySetInnerHTML={{ __html: field.content }}
        />
    );
}
