"use client";

import { cn } from "@/lib/utils";
import { QRCode } from "react-qrcode-logo";

export default function LinkQRModal({
    linkId, 
    open,
    onOpenChange,
}: {
    linkId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <div 
        onClick={() => onOpenChange(false)}
        className={cn(
            "fixed inset-0 z-[60] h-screen w-screen bg-black/50 backdrop-blur-sm flex flex-col gap-4 items-center justify-center transition-opacity duration-200",
            open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}>
            <QRCode id="godly-qr" bgColor="rgba(0,0,0,0.3)" fgColor="rgba(0,169,0,01)" size={400} eyeRadius={10} qrStyle={"dots"} logoImage="https://granted.gg/assets/logo-white.svg" logoOpacity={1} logoPaddingRadius={1}  logoWidth={120} logoHeight={180} removeQrCodeBehindLogo={false} value={`https://granted.gg/${linkId}`} />
            <p className="text-white text-xl font-semibold">granted.gg/{"asd"}</p>
        </div>
    )
}