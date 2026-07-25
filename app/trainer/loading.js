
export default function TrainerLoading() {
    return (
        <div className="flex h-[70vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-foreground/20 border-t-foreground/80" />
                <div className="text-xs text-foreground/40 font-medium tracking-widest uppercase animate-pulse">Loading...</div>
            </div>
        </div>
    )
}
