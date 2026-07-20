import { SearchX, FileQuestion, Database } from 'lucide-react'

export function EmptyState({
    icon = 'file',
    title = 'No Data Found',
    description = 'There are no records to display here yet.',
    action
}) {
    const IconMap = {
        search: SearchX,
        file: FileQuestion,
        database: Database
    }
    const Icon = IconMap[icon] || FileQuestion

    return (
        <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-foreground/10 rounded-2xl bg-foreground/[0.01]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mb-4 border border-foreground/5">
                <Icon className="h-8 w-8 text-foreground/40" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-foreground/40 max-w-sm mx-auto">{description}</p>
            {action && (
                <div className="mt-6">
                    {action}
                </div>
            )}
        </div>
    )
}
