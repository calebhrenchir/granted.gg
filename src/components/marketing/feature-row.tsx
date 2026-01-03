import { cn } from "@/lib/utils";

export function FeatureRow({
    children
}: { 
    children: React.ReactNode;
}) {
    return (
        <section className="flex w-full flex-col items-center justify-center gap-12 px-24 sm:mb-24  sm:flex-row">
            <div className="flex w-full flex-col items-start justify-center gap-12 sm:flex-row">
                {children}
            </div>
        </section>
    )
}

export function FeatureRowItem({
    parentClasses,
    style,
    title,
    description,
    children
}: {
    parentClasses?: string;
    style?: React.CSSProperties;
    title: string;
    description: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex w-full basis-1/4 flex-col gap-4">
            <div className={cn(
                parentClasses,
                "flex aspect-square items-center overflow-hidden rounded-[16px] pointer-events-none"
            )}>
                {children}
            </div>

            <div className="flex flex-col">
              <h3 className="font-semibold mb-1.5 text-md text-white">{title}</h3>
              <div className="text-white/50 font-light text-xs">{description}</div>
            </div>
        </div>
    )
}