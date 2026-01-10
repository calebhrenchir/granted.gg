"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { redirect, useParams, useRouter } from "next/navigation";
import { Loader2, File, Image, Video, Music, FileText, FileCode, Download, CheckCircle2, ChevronLeft, ChevronRight, Play, Pause, Flag } from "lucide-react";
import { calculatePriceWithFee, dollarsToCents, centsToDollars } from "@/lib/stripe";
import { LinkCoverOverlay } from "@/components/link-cover-overlay";
import { NoPreview } from "@/components/no-preview";
import confetti from "canvas-confetti";
import ReportContentModal from "@/components/modal/report-content";

interface FileData {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    blurredS3Url: string | null;
    previewS3Url: string | null;
    isPreviewable: boolean;
    createdAt: string;
}

interface LinkData {
    id: string;
    url: string;
    name: string | null;
    price: number;
    coverPhotoS3Url: string | null;
    coverColor: string | null;
    createdAt: string;
    isPurchaseable: boolean;
}

const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText;
    if (mimeType.includes('code') || mimeType.includes('json') || mimeType.includes('xml')) return FileCode;
    return File;
};

export default function PublicLinkPage() {
    const params = useParams();
    const router = useRouter();
    const linkUrl = params.url as string;
    
    const [link, setLink] = useState<LinkData | null>(null);
    const [files, setFiles] = useState<FileData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasPurchased, setHasPurchased] = useState(false);
    const [email, setEmail] = useState<string>("");
    const [showEmailInput, setShowEmailInput] = useState(false);
    const [realImageLoaded, setRealImageLoaded] = useState(false);
    const [hasScrolled, setHasScrolled] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
    const slideshowRef = useRef<HTMLDivElement>(null);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [purchaserEmail, setPurchaserEmail] = useState<string>("");
    const [hasReported, setHasReported] = useState(false);
    const [purchasedFiles, setPurchasedFiles] = useState<Array<{
        id: string;
        name: string;
        mimeType: string;
        size: number;
        s3Url: string;
        blurredS3Url: string | null;
        createdAt: string;
    }>>([]);

    useEffect(() => {
        if (linkUrl) {
            fetchLink();
        }
    }, [linkUrl]);

    const fetchLink = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/public/links/${linkUrl}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Link not found");
                }
                throw new Error("Failed to fetch link");
            }

            const data = await response.json();
            if (data.success) {
                setLink(data.link);
                setFiles(data.files);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load link");
            console.error("Error fetching link:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!link) return;

        // Validate email if showing email input
        if (showEmailInput && !email) {
            setError("Please enter your email address");
            return;
        }

        if (showEmailInput && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError("Please enter a valid email address");
            return;
        }

        try {
            setIsPurchasing(true);
            setError(null);
            
            // Create checkout session
            const response = await fetch("/api/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    linkId: link.id,
                    email: email || undefined,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to create checkout session");
            }

            const data = await response.json();
            
            // Redirect to Stripe Checkout
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error("Error initiating purchase:", err);
            setError(err instanceof Error ? err.message : "Failed to start purchase");
            setIsPurchasing(false);
        }
    };

    // Build slideshow slides: cover photo + preview files
    interface Slide {
        id: string;
        url: string;
        blurredUrl: string | null;
        isCover: boolean;
        mimeType?: string;
    }

    const { previewFiles, hasPreviewFiles, slides } = useMemo(() => {
        if (!link) {
            return { previewFiles: [], hasPreviewFiles: false, slides: [] };
        }
        
        const previewFiles = files.filter(f => f.isPreviewable && f.previewS3Url);
        const hasPreviewFiles = previewFiles.length > 0;
        const coverPhotoUrl = link.coverPhotoS3Url;
        
        const slides: Slide[] = [];
        if (coverPhotoUrl) {
            slides.push({
                id: 'cover',
                url: coverPhotoUrl,
                blurredUrl: coverPhotoUrl,
                isCover: true,
            });
        }
        previewFiles.forEach(file => {
            if (file.previewS3Url) {
                slides.push({
                    id: file.id,
                    url: file.previewS3Url,
                    blurredUrl: file.blurredS3Url,
                    isCover: false,
                    mimeType: file.mimeType,
                });
            }
        });

        return { previewFiles, hasPreviewFiles, slides };
    }, [files, link]);

    // Check if we're returning from a successful purchase
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const purchased = urlParams.get("purchased");
        const sessionId = urlParams.get("session_id");
        const email = urlParams.get("email");

        if (purchased === "true" && link) {
            if (sessionId) {
                // Fetch purchased files using session ID
                fetchPurchasedFiles();
            } else if (email) {
                // Fetch purchased files using email verification
                setPurchaserEmail(email);
                fetchPurchasedFilesByEmail(email);
            }
        }
    }, [link]);

    const fetchPurchasedFiles = async () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get("session_id");
            
            if (!sessionId) {
                throw new Error("Session ID is required");
            }
            
            // Check if confetti has already been shown for this session
            const confettiKey = `confetti_shown_${sessionId}`;
            const hasShownConfetti = sessionStorage.getItem(confettiKey) === "true";
            
            const response = await fetch(`/api/public/links/${linkUrl}/purchase?session_id=${sessionId}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Failed to fetch purchased files" }));
                throw new Error(errorData.error || "Failed to fetch purchased files");
            }

            const data = await response.json();
            if (data.success) {
                setPurchasedFiles(data.files);
                // Small delay to ensure real image can start loading
                setTimeout(() => {
                    setHasPurchased(true);
                    // Only launch confetti if it hasn't been shown for this session
                    if (!hasShownConfetti) {
                        launchConfetti();
                        sessionStorage.setItem(confettiKey, "true");
                    }
                }, 100);
            }
        } catch (err) {
            console.error("Error fetching purchased files:", err);
        }
    };

    const fetchPurchasedFilesByEmail = async (email: string) => {
        try {
            // Check if confetti has already been shown for this email
            const confettiKey = `confetti_shown_email_${email}`;
            const hasShownConfetti = sessionStorage.getItem(confettiKey) === "true";
            
            const response = await fetch(`/api/public/links/${linkUrl}/verify-purchase?email=${encodeURIComponent(email)}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Failed to verify purchase" }));
                throw new Error(errorData.error || "Failed to verify purchase");
            }

            const data = await response.json();
            if (data.success) {
                setPurchasedFiles(data.files);
                setPurchaserEmail(email);
                // Check if user has already reported this link
                if (link) {
                    checkIfReported(link.id, email);
                }
                // Small delay to ensure real image can start loading
                setTimeout(() => {
                    setHasPurchased(true);
                    // Only launch confetti if it hasn't been shown for this email
                    if (!hasShownConfetti) {
                        launchConfetti();
                        sessionStorage.setItem(confettiKey, "true");
                    }
                }, 100);
            }
        } catch (err) {
            console.error("Error fetching purchased files by email:", err);
        }
    };

    const checkIfReported = async (linkId: string, email: string) => {
        try {
            const response = await fetch(`/api/reports/check?linkId=${linkId}&email=${encodeURIComponent(email)}`);
            if (response.ok) {
                const data = await response.json();
                setHasReported(data.hasReported || false);
            }
        } catch (err) {
            console.error("Error checking if reported:", err);
        }
    };

    // Memoize slides length to avoid dependency issues
    const slidesLength = slides.length;

    // Slideshow navigation - MUST be called before any early returns
    const nextSlide = useCallback(() => {
        if (hasPreviewFiles && slidesLength > 0) {
            // Stop any playing audio when switching slides
            if (playingAudioId) {
                const audio = audioRefs.current[playingAudioId];
                if (audio) {
                    audio.pause();
                    audio.currentTime = 0;
                }
                setPlayingAudioId(null);
            }
            setCurrentSlide((prev) => (prev + 1) % slidesLength);
            //console.log(currentSlide);
        }
    }, [hasPreviewFiles, slidesLength, playingAudioId]);

    const prevSlide = useCallback(() => {
        if (hasPreviewFiles && slidesLength > 0) {
            // Stop any playing audio when switching slides
            if (playingAudioId) {
                const audio = audioRefs.current[playingAudioId];
                if (audio) {
                    audio.pause();
                    audio.currentTime = 0;
                }
                setPlayingAudioId(null);
            }
            setCurrentSlide((prev) => (prev - 1 + slidesLength) % slidesLength);
        }
    }, [hasPreviewFiles, slidesLength, playingAudioId]);

    // Swipe handlers
    const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (!hasPreviewFiles) return;
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        setDragStart(clientX);
        setDragOffset(0);
    };

    const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDragging || !hasPreviewFiles) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const offset = clientX - dragStart;
        setDragOffset(offset);
    };

    const handleDragEnd = () => {
        if (!isDragging || !hasPreviewFiles) return;
        setIsDragging(false);
        
        const threshold = 50; // Minimum drag distance to trigger slide change
        if (Math.abs(dragOffset) > threshold) {
            // Stop any playing audio when switching slides
            if (playingAudioId) {
                const audio = audioRefs.current[playingAudioId];
                if (audio) {
                    audio.pause();
                    audio.currentTime = 0;
                }
                setPlayingAudioId(null);
            }
            if (dragOffset > 0) {
                prevSlide();
            } else {
                nextSlide();
            }
        }
        setDragOffset(0);
    };

    // Keyboard navigation - MUST be called before any early returns
    useEffect(() => {
        if (!hasPreviewFiles) return;
        
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                prevSlide();
            } else if (e.key === 'ArrowRight') {
                nextSlide();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [hasPreviewFiles, prevSlide, nextSlide]);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            // Stop all audio when component unmounts
            Object.values(audioRefs.current).forEach(audio => {
                if (audio) {
                    audio.pause();
                    audio.currentTime = 0;
                }
            });
            setPlayingAudioId(null);
        };
    }, []);

    // Early returns MUST come after all hooks
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh+0rem)] md:h-[calc(100vh-14rem)] bg-black">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
        );
    }

    if (error || !link) {
        return redirect("/");
    }

    // TypeScript now knows link is not null after the early return
    const linkData = link;
    const firstFile = files[0];
    const blurredUrl = firstFile?.blurredS3Url || linkData.coverPhotoS3Url;
    // Get the real image URL when purchased (first image file's s3Url)
    const realImageUrl = hasPurchased && purchasedFiles.length > 0 
        ? purchasedFiles.find(f => f.mimeType.startsWith('image/'))?.s3Url || purchasedFiles[0]?.s3Url
        : null;
    const previewUrl = hasPurchased && realImageUrl ? realImageUrl : (hasPreviewFiles ? slides[currentSlide]?.url : blurredUrl);
    const basePriceInCents = dollarsToCents(linkData.price);
    const totalPriceInCents = calculatePriceWithFee(basePriceInCents);
    const totalPrice = centsToDollars(totalPriceInCents);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatPrice = (price: number) => {
        return price.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const launchConfetti = () => {
        const end = Date.now() + 1.5 * 1000; // 3 seconds
        const colors = ["#ffffff", "#3b82f6", "#ef4444"];

        const frame = () => {
            if (Date.now() > end) return;

            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                startVelocity: 60,
                origin: { x: 0, y: 1 },
                colors: colors,
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                startVelocity: 60,
                origin: { x: 1, y: 1 },
                colors: colors,
            });

            requestAnimationFrame(frame);
        };

        frame();
    };

    return (
        <>
            <div className="bg-black flex items-center justify-center px-4 md:px-0 md:max-w-7xl mx-auto h-[calc(100vh+0rem)] md:h-[calc(100vh-14rem)]">
            <div className="w-full flex flex-col md:flex-row items-center justify-center md:items-center gap-8 md:gap-4 max-w-7xl mx-auto">
                <div className="relative aspect-square w-full max-w-xl md:max-w-lg md:flex-shrink-0 md:w-1/2 mt-18 md:mt-0">
                    {hasPreviewFiles && slides.length > 0 && !hasPurchased ? (
                        <div 
                            ref={slideshowRef}
                            className="absolute inset-0 z-0 overflow-hidden rounded-[60px]"
                            onTouchStart={handleDragStart}
                            onTouchMove={handleDragMove}
                            onTouchEnd={handleDragEnd}
                            onMouseDown={handleDragStart}
                            onMouseMove={handleDragMove}
                            onMouseUp={handleDragEnd}
                            onMouseLeave={handleDragEnd}
                            style={{
                                cursor: hasPreviewFiles ? (isDragging ? 'grabbing' : 'grab') : 'default',
                            }}
                        >
                            <div 
                                className="flex h-full transition-transform duration-300 ease-out"
                                style={{
                                    transform: `translateX(calc(-${currentSlide * 100}% + ${dragOffset}px))`,
                                }}
                            >
                                {slides.map((slide, index) => {
                                    const isImage = slide.mimeType?.startsWith('image/') ?? true;
                                    const isVideo = slide.mimeType?.startsWith('video/') ?? false;
                                    const isAudio = slide.mimeType?.startsWith('audio/') ?? false;
                                    const isPlaying = playingAudioId === slide.id;
                                    
                                    const handleAudioPlay = () => {
                                        const audio = audioRefs.current[slide.id];
                                        if (audio) {
                                            if (isPlaying) {
                                                audio.pause();
                                                setPlayingAudioId(null);
                                            } else {
                                                // Pause all other audio
                                                Object.values(audioRefs.current).forEach(a => {
                                                    if (a && a !== audio) {
                                                        a.pause();
                                                        a.currentTime = 0;
                                                    }
                                                });
                                                audio.play();
                                                setPlayingAudioId(slide.id);
                                            }
                                        }
                                    };

                                    const handleAudioEnded = () => {
                                        setPlayingAudioId(null);
                                    };

                                    const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
                                        const video = e.currentTarget;
                                        // Limit preview to 5 seconds and restart
                                        if (video.currentTime >= 5) {
                                            video.currentTime = 0;
                                            video.play();
                                        }
                                    };
                                    
                                    return (
                                        <div 
                                            key={slide.id} 
                                            className="min-w-full h-full relative flex-shrink-0"
                                        >
                                            {/* Blurred background - only for images/videos */}
                                            {slide.blurredUrl && !isAudio && (
                                                <img 
                                                    alt={link?.name || "Preview"} 
                                                    className="absolute inset-0 h-full w-full object-cover opacity-100"
                                                    src={slide.blurredUrl}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            )}
                                            
                                            {/* Actual preview (if not purchased, show blurred; if purchased, show real) */}
                                            {hasPurchased ? (
                                                // After purchase, show real content
                                                isImage ? (
                                                    <img 
                                                        alt={link?.name || "Preview"} 
                                                        className="absolute inset-0 h-full w-full object-cover"
                                                        src={slide.url}
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                ) : isVideo ? (
                                                    <video 
                                                        className="absolute inset-0 h-full w-full object-cover"
                                                        src={slide.url}
                                                        controls={false}
                                                        muted
                                                        playsInline
                                                    />
                                                ) : isAudio ? (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-black/80 to-black/60">
                                                        <button
                                                            onClick={handleAudioPlay}
                                                            className="group relative flex items-center justify-center w-32 h-32 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border-2 border-white/20 hover:border-white/40"
                                                        >
                                                            {isPlaying ? (
                                                                <Pause className="w-16 h-16 text-white" />
                                                            ) : (
                                                                <Play className="w-16 h-16 text-white ml-2" />
                                                            )}
                                                        </button>
                                                        <audio
                                                            ref={(el) => {
                                                                audioRefs.current[slide.id] = el;
                                                            }}
                                                            src={slide.url}
                                                            onEnded={handleAudioEnded}
                                                            preload="metadata"
                                                        />
                                                    </div>
                                                ) : null
                                            ) : (
                                                <>
                                                    <div className="absolute top-6 left-6 px-3 bg-white/10 rounded-full backdrop-blur-xl shadow-sm z-10">
                                                        <span className="text-white font-semibold text-sm">Preview</span>
                                                    </div>
                                                    {isImage ? (
                                                        <img 
                                                            alt={link?.name || "Preview"} 
                                                            className="absolute inset-0 h-full w-full object-cover"
                                                            src={slide.url}
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : isVideo ? (
                                                        <video 
                                                            className="absolute inset-0 h-full w-full object-cover"
                                                            src={slide.url}
                                                            controls={false}
                                                            muted
                                                            autoPlay
                                                            playsInline
                                                            loop={false}
                                                            onTimeUpdate={handleVideoTimeUpdate}
                                                        />
                                                    ) : isAudio ? (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-black/80 to-black/60">
                                                            <button
                                                                onClick={handleAudioPlay}
                                                                className="group relative flex items-center justify-center w-32 h-32 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border-2 border-white/20 hover:border-white/40"
                                                            >
                                                                {isPlaying ? (
                                                                    <Pause className="w-16 h-16 text-white" />
                                                                ) : (
                                                                    <Play className="w-16 h-16 text-white ml-2" />
                                                                )}
                                                            </button>
                                                            
                                                            <audio
                                                                ref={(el) => {
                                                                    audioRefs.current[slide.id] = el;
                                                                }}
                                                                src={slide.url}
                                                                onEnded={handleAudioEnded}
                                                                preload="metadata"
                                                            />
                                                        </div>
                                                    ) : null}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Navigation arrows */}
                            {slides.length > 1 && (
                                <>
                                    <button
                                        onClick={prevSlide}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors backdrop-blur-sm"
                                        aria-label="Previous slide"
                                    >
                                        <ChevronLeft className="w-6 h-6 text-white" />
                                    </button>
                                    <button
                                        onClick={nextSlide}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors backdrop-blur-sm"
                                        aria-label="Next slide"
                                    >
                                        <ChevronRight className="w-6 h-6 text-white" />
                                    </button>
                                </>
                            )}

                            {/* Slide indicators */}
                            {slides.length > 1 && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                                    {slides.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                // Stop any playing audio when switching slides
                                                if (playingAudioId) {
                                                    const audio = audioRefs.current[playingAudioId];
                                                    if (audio) {
                                                        audio.pause();
                                                        audio.currentTime = 0;
                                                    }
                                                    setPlayingAudioId(null);
                                                }
                                                setCurrentSlide(index);
                                            }}
                                            className={`h-2 rounded-full transition-all ${
                                                index === currentSlide 
                                                    ? 'w-8 bg-white' 
                                                    : 'w-2 bg-white/50 hover:bg-white/70'
                                            }`}
                                            aria-label={`Go to slide ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="absolute inset-0 z-0 overflow-hidden rounded-[60px]">
                            {previewUrl ? (
                                <>
                                    {/* Blurred image - fades out when real image is loaded */}
                                    {blurredUrl && (
                                        <img 
                                            alt={linkData.name || "Preview"} 
                                            
                                            className={`h-full w-full object-cover transition-opacity duration-1000 pointer-events-none ${
                                                hasPurchased && realImageLoaded ? 'opacity-0 absolute inset-0' : 'opacity-100'
                                            }`}
                                            src={blurredUrl}
                                            onError={(e) => {
                                                console.error("Failed to load blurred image:", blurredUrl);
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    )}
                                    {/* Real image - fades in when unlocked and loaded */}
                                    {hasPurchased && realImageUrl && (
                                        <img 
                                            alt={linkData.name || "Preview"} 
                                            className={`h-full w-full object-cover transition-opacity duration-1000 pointer-events-none ${
                                                realImageLoaded ? 'opacity-100' : 'opacity-0'
                                            }`}
                                            src={realImageUrl}
                                            onLoad={() => {
                                                setRealImageLoaded(true);
                                            }}
                                            onError={(e) => {
                                                console.error("Failed to load real image:", realImageUrl);
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    )}
                                </>
                            ) : (
                                <NoPreview coverColor={linkData.coverColor} />
                            )}
                        </div>
                    )}

                    <LinkCoverOverlay 
                        isUnlocked={hasPurchased}
                        price={`$${formatPrice(totalPrice)}`}
                        className={`transition-all duration-300 ease-in-out ${currentSlide === 0 ? "opacity-100" : "opacity-0"}`}
                    />
                </div>

                {/* Information - Right side on desktop */}
                <div className="w-full md:w-1/2 flex flex-col gap-6 md:justify-center">
                    {hasPurchased ? (
                        <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col items-center md:items-start gap-2">
                                <div className="flex flex-row justify-between w-full ">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                                        <h1 className="text-3xl font-bold text-white text-center md:text-left">
                                            Access Granted
                                        </h1>
                                    </div>

                                    <div className="flex flex-row gap-2 items-center">
                                        {hasReported ? (
                                            <span className="text-white/50 text-sm flex items-center gap-1" title="You have already reported this link">
                                                <Flag className="w-4 h-4" />
                                                Reported
                                            </span>
                                        ) : (
                                            <button 
                                                onClick={() => setReportModalOpen(true)}
                                                className="flex items-center justify-center p-2 rounded-lg transition-colors duration-200 text-red-300/50 hover:text-red-300 cursor-pointer font-semibold text-sm gap-1"
                                                title="Report content"
                                            >
                                                <Flag className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-row justify-between w-full items-center">
                                    <p className="text-white/70 text-lg">
                                        {linkData.name || `Link ${linkData.url}`}
                                    </p>

                                    <div className="flex flex-row gap-2">
                                        <button className="flex items-center justify-center p-2 rounded-lg bg-white hover:bg-white/90 transition-colors duration-200 text-black font-semibold text-sm gap-1">
                                            <Download className="w-4 h-4 text-black" />
                                            Download Files
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                                {purchasedFiles.map((file) => {
                                    const FileIcon = getFileIcon(file.mimeType);
                                    const isImage = file.mimeType.startsWith('image/');
                                    
                                    return (
                                        <div
                                            key={file.id}
                                            className="group relative flex flex-col gap-3 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/10 hover:border-white/30"
                                        >
                                            {isImage && file.s3Url ? (
                                                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-white/5">
                                                    <img
                                                        src={file.s3Url}
                                                        alt={file.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                                    
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center aspect-video w-full bg-white/5 rounded-lg">
                                                    <FileIcon className="w-12 h-12 text-white/40" />
                                                </div>
                                            )}
                                            
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-white text-sm font-semibold truncate flex-1">
                                                        {file.name}
                                                    </span>
                                                    <a
                                                        href={file.s3Url}
                                                        //download={file.name}
                                                        
                                                        className="flex items-center justify-center p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                        }}
                                                    >
                                                        <Download className="w-4 h-4 text-white/80" />
                                                    </a>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-white/50">
                                                    <FileIcon className="w-3 h-3" />
                                                    <span>{formatFileSize(file.size)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="w-full flex flex-col gap-5 max-w-md mx-auto">
                                    <div className="flex flex-row justify-between items-center">
                                        <h1 className="text-3xl font-bold text-white">
                                                {linkData.name || `Link ${linkData.url}`}
                                        </h1>
                                        <p className="text-white/70 text-3xl font-semibold">
                                            Total
                                        </p>
                                    </div>

                            <div className="flex flex-row justify-between items-center">
                                <div className="flex flex-row gap-2">
                                    {(() => {
                                        // Group files by type
                                        const fileGroups = new Map<typeof Image | typeof Video | typeof Music | typeof FileText | typeof FileCode | typeof File, number>();
                                        
                                        files.forEach((file) => {
                                            const icon = getFileIcon(file.mimeType);
                                            const currentCount = fileGroups.get(icon) || 0;
                                            fileGroups.set(icon, currentCount + 1);
                                        });

                                        return Array.from(fileGroups.entries()).map(([IconComponent, count], index) => (
                                            <div key={index} className="flex flex-row items-center gap-3">
                                                <IconComponent className="w-5 h-5 text-white/70" />
                                                <p className="text-white text-xl font-semibold">
                                                    {count}
                                                </p>
                                            </div>
                                        ));
                                    })()}
                                </div>
                                
                                <p className="text-white text-2xl font-semibold">
                                        ${formatPrice(Number(linkData.price))}
                                    </p>
                            </div>
                            
                            {error && (
                                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            {link.isPurchaseable ? (
                                 <div className="flex flex-col gap-4">
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
                                            Email Address (to receive your access link)
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                setError(null);
                                            }}
                                            placeholder="your@email.com"
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder:text-white/50"
                                        />
                                    </div>
    
                                    <button
                                        onClick={handlePurchase}
                                        disabled={isPurchasing || !email}
                                        className="px-8 py-4 text-xl text-center bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full md:w-auto cursor-pointer"
                                    >
                                        {isPurchasing ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            `Purchase to Unlock`
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <span className="text-red-400 text-lg font-semibold text-center">This link is not purchaseable at the moment.  Check again later.</span>
                            )}

                            <div className="text-white flex flex-row items-center gap-1 text-sm font-semibold mx-auto">
                                <p>Powered by</p>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 43 18" className="h-auto w-9.5"><path fill="#6461FC" d="M20.31 4.279h2.928v9.93H20.31z"></path><path fill="#6461FC" fillRule="evenodd" d="m17.172 5.118-.187-.84h-2.52v9.93h2.917v-6.73c.688-.873 1.855-.714 2.216-.59v-2.61c-.373-.136-1.738-.385-2.426.84M3.452 7.161c0-.442.373-.612.991-.612.887 0 2.007.26 2.894.726V4.608a7.9 7.9 0 0 0-2.894-.522C2.075 4.086.5 5.289.5 7.298c0 3.132 4.433 2.632 4.433 3.983 0 .522-.466.692-1.12.692-.968 0-2.205-.386-3.185-.908v2.701a8.3 8.3 0 0 0 3.185.647c2.427 0 4.095-1.169 4.095-3.2-.011-3.382-4.456-2.78-4.456-4.052M42.5 9.284c0-2.906-1.447-5.198-4.212-5.198-2.776 0-4.456 2.292-4.456 5.175 0 3.416 1.983 5.14 4.83 5.14 1.388 0 2.438-.306 3.231-.737v-2.27c-.793.386-1.703.624-2.858.624-1.132 0-2.135-.385-2.263-1.725h5.705c0-.147.023-.737.023-1.01m-5.763-1.079c0-1.282.805-1.815 1.54-1.815.711 0 1.47.533 1.47 1.815zM29.328 4.086c-1.143 0-1.878.522-2.286.885l-.152-.703h-2.567V17.5l2.917-.602.012-3.211c.42.295 1.038.715 2.065.715 2.088 0 3.99-1.634 3.99-5.232-.012-3.291-1.937-5.084-3.979-5.084m-.7 7.819c-.688 0-1.096-.238-1.376-.533l-.012-4.21c.303-.33.723-.557 1.388-.557 1.062 0 1.797 1.158 1.797 2.644 0 1.521-.724 2.656-1.797 2.656M11.338 1.816l-2.846.59-.012 9.09c0 1.68 1.295 2.917 3.021 2.917.957 0 1.657-.17 2.042-.374v-2.304c-.373.147-2.216.67-2.216-1.01V6.696h2.216V4.28h-2.216zM20.31 3.417l2.928-.613V.5l-2.928.601z" clipRule="evenodd"></path>
                                </svg>
                            </div>

                            <div className="relative flex w-full flex-col gap-3 p-6 border-neutral-800 text-white rounded-xl border mt-4 md:mt-0">
                                <p className="text-xl font-semibold">Total details</p>
                                <div className="flex w-full flex-row items-center justify-between">
                                    <p className="text-white/70 text-xl font-semibold">Content</p>
                                    <p className="text-white text-xl font-semibold">${formatPrice(Number(link.price))}</p>
                                </div>
                                <div className="flex w-full flex-row items-center justify-between">
                                    <p className="text-white/70 text-xl font-semibold">Privacy First Fee</p>
                                    <p className="text-white text-xl font-semibold">${formatPrice(Number(linkData.price) * 0.1)}</p>
                                </div>
                                <div className="flex w-full flex-row items-center justify-between">
                                    <p className="text-white/70 text-xl font-semibold">Total</p>
                                    <p className="text-white text-xl font-semibold">${formatPrice(Number(linkData.price) + (Number(linkData.price) * 0.1))}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        {link && (
            <ReportContentModal
                linkId={link.id}
                linkUrl={linkUrl}
                reporterEmail={purchaserEmail}
                open={reportModalOpen}
                onOpenChange={(open) => {
                    setReportModalOpen(open);
                    if (!open) {
                        // Refresh report status when modal closes
                        if (link && purchaserEmail) {
                            checkIfReported(link.id, purchaserEmail);
                        }
                    }
                }}
            />
        )}
        </>
    );
}

