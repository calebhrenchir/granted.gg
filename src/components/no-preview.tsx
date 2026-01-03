import { cn } from "@/lib/utils";

interface NoPreviewProps {
    className?: string;
    message?: string;
    coverColor?: string | null;
}

export function NoPreview({ className, message = "No preview", coverColor }: NoPreviewProps) {
    // Use provided coverColor or fallback to default blue
    const bgColor = coverColor || "bg-blue-300/50";
    
    return (
        <div className={cn(
            "h-full w-full flex items-center justify-center blur-3xl",
            bgColor,
            className
        )}>
            
        </div>
    );
}

