"use client"
import { useEffect, useState, useRef } from "react";
import { Safari } from "../ui/safari";
import { Iphone } from "../ui/iphone";

export default function StackedDevices() {
    const [scrollY, setScrollY] = useState(0);
    const [safariTransform, setSafariTransform] = useState(0);
    const [iphoneTransform, setIphoneTransform] = useState(0);
    const sectionRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const handleScroll = () => {
        setScrollY(window.scrollY);
        
        // Only animate on desktop (sm and up, 640px+)
        if (window.innerWidth < 640) {
            setSafariTransform(0);
            setIphoneTransform(0);
            return;
        }
        
        if (sectionRef.current) {
            const rect = sectionRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            
            // Calculate when section enters viewport
            // Start animation when section top is at 80% of viewport
            const startPoint = windowHeight * 0.8;
            const endPoint = -rect.height * 0.2; // End when section is mostly scrolled past
            
            // Calculate progress (0 to 1)
            let progress = 0;
            if (rect.top < startPoint && rect.top > endPoint) {
            progress = 1 - (rect.top - endPoint) / (startPoint - endPoint);
            } else if (rect.top <= endPoint) {
            progress = 1;
            }
            
            // Clamp progress between 0 and 1
            progress = Math.max(0, Math.min(1, progress));
            
            // Apply transforms: Safari goes to -180px, iPhone goes to 180px
            setSafariTransform(50 * progress);
            setIphoneTransform(-50 * progress);
        }
        };
        
        window.addEventListener("scroll", handleScroll);
        window.addEventListener("resize", handleScroll); // Recalculate on resize
        handleScroll(); // Initial calculation
        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleScroll);
        };
    }, []);

    return (
        <section 
        ref={sectionRef}
        className="relative flex flex-col w-full items-center justify-center overflow-hidden sm:flex-row mb-38 pointer-events-none"
        >
        <div
            className="relativebg-neutral-900 hidden sm:block relative w-[220px] sm:w-[600px] h-[500px] z-1 rounded-[24px] sm:rounded-lg border-4 border-white/50 dark transition-transform duration-75 ease-out sm:top-1/4 overflow-hidden" 
            style={{ transform: `translateX(${safariTransform}px)` }}
        >
            <div className="absolute top-0 bg-transparent flex h-[32px] w-full items-center justify-between px-2 z-[200]">
                <div className="flex h-[12px] w-[32px] max-w-sm items-center gap-[4px] z-1">
                    <div className="h-[4px] w-[4px] rounded-full bg-neutral-500/20"></div>
                    <div className="h-[4px] w-[4px] rounded-full bg-neutral-500/20"></div>
                    <div className="h-[4px] w-[4px] rounded-full bg-neutral-500/20"></div>
                </div>

                <div className="bg-neutral-500/20 -ml-[32px] h-[12px] w-full max-w-xs justify-self-center rounded-[4px]">
                </div>
            </div>

            <video src="https://digitalcontent.tesla.com/tesla-contents/video/upload/f_auto,q_auto:best/Homepage-FSD-Desktop.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="absolute w-full h-full object-cover top-0 z-1"
            />
        </div>
        <svg aria-hidden="true" viewBox="0 0 418 42" className="absolute top-1/4 left-0 h-[12.58em] w-full fill-neutral-500/20 blur-sm" preserveAspectRatio="none"><path d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.78 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203 1.53-1.825.399-2.335-2.911-1.31-4.893-1.604-22.048-3.261-57.509-5.556-87.871-7.36-132.059-7.842-23.239-.254-33.617-.116-50.627.674-11.629.54-42.371 2.494-46.696 2.967-2.359.259 8.133-3.625 26.504-9.81 23.239-7.825 27.934-10.149 28.304-14.005.417-4.348-3.529-6-16.878-7.066Z"></path></svg>
        <svg aria-hidden="true" viewBox="0 0 281 40" preserveAspectRatio="none" className="absolute top-2/4 left-0 h-[12em] w-full fill-neutral-400/20 blur-sm"><path fillRule="evenodd" clipRule="evenodd" d="M240.172 22.994c-8.007 1.246-15.477 2.23-31.26 4.114-18.506 2.21-26.323 2.977-34.487 3.386-2.971.149-3.727.324-6.566 1.523-15.124 6.388-43.775 9.404-69.425 7.31-26.207-2.14-50.986-7.103-78-15.624C10.912 20.7.988 16.143.734 14.657c-.066-.381.043-.344 1.324.456 10.423 6.506 49.649 16.322 77.8 19.468 23.708 2.65 38.249 2.95 55.821 1.156 9.407-.962 24.451-3.773 25.101-4.692.074-.104.053-.155-.058-.135-1.062.195-13.863-.271-18.848-.687-16.681-1.389-28.722-4.345-38.142-9.364-15.294-8.15-7.298-19.232 14.802-20.514 16.095-.934 32.793 1.517 47.423 6.96 13.524 5.033 17.942 12.326 11.463 18.922l-.859.874.697-.006c2.681-.026 15.304-1.302 29.208-2.953 25.845-3.07 35.659-4.519 54.027-7.978 9.863-1.858 11.021-2.048 13.055-2.145a61.901 61.901 0 0 0 4.506-.417c1.891-.259 2.151-.267 1.543-.047-.402.145-2.33.913-4.285 1.707-4.635 1.882-5.202 2.07-8.736 2.903-3.414.805-19.773 3.797-26.404 4.829Zm40.321-9.93c.1-.066.231-.085.29-.041.059.043-.024.096-.183.119-.177.024-.219-.007-.107-.079ZM172.299 26.22c9.364-6.058 5.161-12.039-12.304-17.51-11.656-3.653-23.145-5.47-35.243-5.576-22.552-.198-33.577 7.462-21.321 14.814 12.012 7.205 32.994 10.557 61.531 9.831 4.563-.116 5.372-.288 7.337-1.559Z"></path></svg>
        <video
            src="https://digitalcontent.tesla.com/tesla-contents/video/upload/f_auto,q_auto:best/Homepage-FSD-Desktop.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="bg-neutral-900 relative z-1 inline-block w-[340px] rounded-[40px] border-4 border-white/50 shrink-0 overflow-hidden h-[650px] sm:h-[654px] sm:w-[305px] dark transition-transform duration-75 ease-out object-cover" 
            style={{ transform: `translateX(${iphoneTransform}px)` }}
        />
        </section>
    );
}