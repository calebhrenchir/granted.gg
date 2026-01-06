"use client";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MaskInput } from "@/components/ui/mask-input";
import { cn } from "@/lib/utils";
import { Ellipsis, File, FilePlus, Folder, FolderPlus, Plus, X, Image, FileText, Video, Music, FileCode, Copy, Share2, Check } from "lucide-react";
import { LinkCoverOverlay } from "@/components/link-cover-overlay";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { invalidateLinksListCache } from "@/lib/cache";
import NeedsOnboardingModal from "@/components/modal/needs-onboarding";
import { NoPreview } from "@/components/no-preview";
import SequenceCanvas from "@/components/marketing/canvases/sequence-canvas";

export default function HomePage() {
    const { data: session, status } = useSession();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filePreviews, setFilePreviews] = useState<Record<number, string>>({});
    const [fileDurations, setFileDurations] = useState<Record<number, number>>({});
    const [price, setPrice] = useState<string>("");
    const [shimmerKey, setShimmerKey] = useState<number>(0);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [currentUploadIndex, setCurrentUploadIndex] = useState<number>(0);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [showPriceSection, setShowPriceSection] = useState<boolean>(true);
    const [uploadComplete, setUploadComplete] = useState<boolean>(false);
    const [linkCopied, setLinkCopied] = useState<boolean>(false);
    const [generatedLink, setGeneratedLink] = useState<string>("");
    const [uploadedFilesData, setUploadedFilesData] = useState<Array<{ blurredS3Key: string | null; blurredS3Url: string | null; s3Key: string; s3Url: string }>>([]);
    const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const MAX_FILES = 10;
    const [showNeedsOnboardingModal, setShowNeedsOnboardingModal] = useState<boolean>(false);
    const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getMediaDuration = (file: File, index: number) => {
        if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
            const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
            const url = URL.createObjectURL(file);
            media.src = url;
            media.onloadedmetadata = () => {
                setFileDurations(prev => ({ ...prev, [index]: media.duration }));
                URL.revokeObjectURL(url);
            };
            media.load();
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(event.target.files || []);
        const totalFiles = selectedFiles.length + newFiles.length;
        
        if (totalFiles > MAX_FILES) {
            alert(`You can only upload up to ${MAX_FILES} files total. You currently have ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}.`);
            // Reset the input so the same file can be selected again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        const updatedFiles = [...selectedFiles, ...newFiles];
        setSelectedFiles(updatedFiles);
        
        // Get durations for video/audio files
        newFiles.forEach((file, offset) => {
            const index = selectedFiles.length + offset;
            getMediaDuration(file, index);
        });
        
        // TODO: Implement S3 upload logic here
        console.log("Selected files:", updatedFiles);
        
        // Reset the input so the same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Fetch onboarding status from database
    useEffect(() => {
        const fetchOnboardingStatus = async () => {
            if (status !== "authenticated") return;
            
            try {
                const response = await fetch("/api/onboarding");
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        setIsOnboardingComplete(data.data.isIdentityVerified || false);
                    }
                }
            } catch (err) {
                console.error("Error fetching onboarding status:", err);
                setIsOnboardingComplete(false);
            }
        };

        fetchOnboardingStatus();
    }, [status]);

    const handleButtonClick = async () => {
        // If we don't have the status yet, fetch it
        if (isOnboardingComplete === null) {
            try {
                const response = await fetch("/api/onboarding");
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        const verified = data.data.isIdentityVerified || false;
                        setIsOnboardingComplete(verified);
                        if (verified) {
                            fileInputRef.current?.click();
                        } else {
                            setShowNeedsOnboardingModal(true);
                        }
                        return;
                    }
                }
            } catch (err) {
                console.error("Error fetching onboarding status:", err);
            }
            // If fetch fails, show modal
            setShowNeedsOnboardingModal(true);
            return;
        }

        // Use cached status
        if (isOnboardingComplete) {
            fileInputRef.current?.click();
        } else {
            setShowNeedsOnboardingModal(true);
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        // Clean up preview URL if it exists
        if (filePreviews[indexToRemove]) {
            URL.revokeObjectURL(filePreviews[indexToRemove]);
        }
        setSelectedFiles(selectedFiles.filter((_, index) => index !== indexToRemove));
        const newPreviews = { ...filePreviews };
        const newDurations = { ...fileDurations };
        delete newPreviews[indexToRemove];
        delete newDurations[indexToRemove];
        // Reindex previews and durations
        const reindexedPreviews: Record<number, string> = {};
        const reindexedDurations: Record<number, number> = {};
        Object.keys(newPreviews).forEach((key) => {
            const oldIndex = parseInt(key);
            if (oldIndex > indexToRemove) {
                reindexedPreviews[oldIndex - 1] = newPreviews[oldIndex];
                if (newDurations[oldIndex] !== undefined) {
                    reindexedDurations[oldIndex - 1] = newDurations[oldIndex];
                }
            } else if (oldIndex < indexToRemove) {
                reindexedPreviews[oldIndex] = newPreviews[oldIndex];
                if (newDurations[oldIndex] !== undefined) {
                    reindexedDurations[oldIndex] = newDurations[oldIndex];
                }
            }
        });
        setFilePreviews(reindexedPreviews);
        setFileDurations(reindexedDurations);
    };

    // Generate previews for image files only
    useEffect(() => {
        setFilePreviews(prev => {
            const newPreviews = { ...prev };
            
            // Create previews only for image files
            selectedFiles.forEach((file, index) => {
                if (file.type.startsWith('image/') && !newPreviews[index]) {
                    newPreviews[index] = URL.createObjectURL(file);
                }
            });

            // Clean up previews for files that no longer exist
            Object.keys(newPreviews).forEach(key => {
                const index = parseInt(key);
                if (index >= selectedFiles.length) {
                    if (newPreviews[index] && !newPreviews[index].startsWith('data:')) {
                        URL.revokeObjectURL(newPreviews[index]);
                    }
                    delete newPreviews[index];
                }
            });

            return newPreviews;
        });
    }, [selectedFiles]);

    const getFileIcon = (file: File | undefined) => {
        if (!file || !file.type) return File;
        if (file.type.startsWith('image/')) {
            return Image;
        } else if (file.type.startsWith('video/')) {
            return Video;
        } else if (file.type.startsWith('audio/')) {
            return Music;
        } else if (file.type === 'application/pdf') {
            return FileText;
        } else if (file.type.includes('text') || file.type.includes('code') || file.type.includes('json') || file.type.includes('xml')) {
            return FileCode;
        }
        return File;
    };

    const getFileExtension = (fileName: string) => {
        const parts = fileName.split('.');
        return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
    };

    const getFileTypeName = (file: File | undefined) => {
        if (!file) return 'FILE';
        if (file.type) {
            const typeParts = file.type.split('/');
            if (typeParts.length > 1) {
                const mainType = typeParts[0];
                const subType = typeParts[1];
                
                if (mainType === 'application') {
                    if (subType.includes('pdf')) return 'PDF';
                    if (subType.includes('zip') || subType.includes('rar') || subType.includes('7z')) return 'Archive';
                    if (subType.includes('json')) return 'JSON';
                    if (subType.includes('xml')) return 'XML';
                    return subType.toUpperCase();
                }
                
                return subType.toUpperCase();
            }
        }
        
        // Fallback to extension if no MIME type
        const ext = getFileExtension(file.name);
        return ext || 'FILE';
    };

    const handlePriceChange = (maskedValue: string, unmaskedValue: string) => {
        const prevPrice = price;
        setPrice(unmaskedValue);
        
        // Trigger shimmer when price becomes valid
        const prevNumeric = parseFloat(prevPrice.replace(/[^0-9.]/g, ''));
        const newNumeric = parseFloat(unmaskedValue.replace(/[^0-9.]/g, ''));
        const wasValid = !isNaN(prevNumeric) && prevNumeric >= 5.00;
        const isValid = !isNaN(newNumeric) && newNumeric >= 5.00;
        
        // Trigger shimmer if price just became valid or changed while valid
        if (isValid && (!wasValid || prevNumeric !== newNumeric)) {
            setShimmerKey(prev => prev + 1);
        }
    };

    const getPriceMessage = () => {
        if (!price || price.trim() === "") {
            return "Set your price.";
        }
        
        const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
        
        if (isNaN(numericPrice) || numericPrice < 5.00) {
            return "The price must be at least $5.00.";
        }
        
        const amountReceived = numericPrice * 0.9;
        const formattedAmount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amountReceived);
        
        return `You will receive ${formattedAmount}.`;
    };

    const isValidPrice = () => {
        if (!price || price.trim() === "") return false;
        const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
        return !isNaN(numericPrice) && numericPrice >= 5.00;
    };

    const handleCreateLink = async () => {
        if (!isValidPrice() || selectedFiles.length === 0) return;
        
        // Check if user is authenticated
        if (status === "unauthenticated" || !session) {
            alert("Please log in to create a link.");
            return;
        }
        
        // Fade out price section
        setShowPriceSection(false);
        
        // Start upload after fade animation
        setTimeout(async () => {
            setIsUploading(true);
            setCurrentUploadIndex(0);
            setUploadProgress(0);

            try {
                // Create FormData with files and price
                const formData = new FormData();
                formData.append("price", price);
                selectedFiles.forEach((file) => {
                    formData.append("files", file);
                });

                // Upload files to S3 and create link
                const response = await fetch("/api/links/create", {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || "Failed to create link");
                }

                const data = await response.json();
                console.log("Upload response data:", data);
                
                // Store uploaded files data (includes blurredS3Key)
                if (data.files) {
                    setUploadedFilesData(data.files);
                    console.log("Uploaded files data:", data.files);
                }
                
                // Store cover photo URL (blurred version)
                if (data.link?.coverPhotoS3Url) {
                    setCoverPhotoUrl(data.link.coverPhotoS3Url);
                    console.log("Cover photo URL:", data.link.coverPhotoS3Url);
                }
                
                // Invalidate links list cache since we created a new link
                invalidateLinksListCache();
                
                // Update progress to 100% for all files
                setUploadProgress(100);
                
                // Wait a moment then show completion
                setTimeout(() => {
                    setIsUploading(false);
                    setUploadComplete(true);
                    // Store the generated link URL
                    if (data.link?.url) {
                        setGeneratedLink(`granted.gg/${data.link.url}`);
                    }
                }, 500);
            } catch (error) {
                console.error("Error creating link:", error);
                // Reset state on error
                setIsUploading(false);
                setShowPriceSection(true);
                alert("Failed to create link. Please try again.");
            }
        }, 300);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(`https://${generatedLink}`);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: 'Granted Link',
            text: 'Check out this granted link',
            url: `https://${generatedLink}`,
        };

        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(`https://${generatedLink}`);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
            }
        } catch (err) {
            // User cancelled or error occurred
            if ((err as Error).name !== 'AbortError') {
                console.error('Error sharing:', err);
            }
        }
    };

    // Handle upload progress for each file
    useEffect(() => {
        // Clean up any existing interval
        if (uploadIntervalRef.current) {
            clearInterval(uploadIntervalRef.current);
            uploadIntervalRef.current = null;
        }

        if (!isUploading) {
            return;
        }

        if (currentUploadIndex >= selectedFiles.length) {
            setIsUploading(false);
            setUploadComplete(true);
            return;
        }

        // Reset progress for new file
        setUploadProgress(0);
        
        // Simulate upload progress
        uploadIntervalRef.current = setInterval(() => {
            setUploadProgress(prev => {
                const nextProgress = prev + 2;
                if (nextProgress >= 100) {
                    if (uploadIntervalRef.current) {
                        clearInterval(uploadIntervalRef.current);
                        uploadIntervalRef.current = null;
                    }
                    // Move to next file after a brief delay
                    setTimeout(() => {
                        setCurrentUploadIndex(prevIndex => {
                            const nextIndex = prevIndex + 1;
                            return nextIndex;
                        });
                    }, 300);
                    return 100;
                }
                return nextProgress;
            });
        }, 50); // Update every 50ms for smooth animation
        
        return () => {
            if (uploadIntervalRef.current) {
                clearInterval(uploadIntervalRef.current);
                uploadIntervalRef.current = null;
            }
        };
    }, [isUploading, currentUploadIndex, selectedFiles.length]);
    return (
       <div className="px-4 md:px-0 md:max-w-7xl mx-auto flex justify-center items-center h-[calc(100vh-12rem)] overflow-hidden">
            <div className="flex flex-col mx-auto items-center justify-center gap-6">
                {!isUploading && !uploadComplete && (
                    <div className={cn(
                        "flex flex-col items-center gap-2 transition-opacity duration-500",
                        showPriceSection ? "opacity-100" : "opacity-0"
                    )}>
                    {selectedFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center md:flex-row">
                            <h1 className="">{process.env.NEXT_PUBLIC_BASE_URL}</h1>
                            <button className="rotate-[-6.25deg] [--x:180px] [--rotate:-6.25deg] group/button pointer-events-auto h-[200px] w-[200px] min-w-[200px] rounded-xl p-3 transition-transform duration-300 hover:rotate-[-0.5deg] bg-neutral-800 shadow-[0px_0px_0px_1px_rgba(255,255,255,0.1)] cursor-pointer">
                                <div className="relative flex h-full w-full items-center justify-center rounded-lg transition-all duration-300 after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-lg after:border after:border-[rgba(0,0,0,0.05)] group-hover/button:bg-white/[0.02]">
                                    <SequenceCanvas
                                    sequencePath="upload-box-one"
                                    frameCount={138}
                                    fps={60}
                                    canvasWidth={200}
                                    canvasHeight={200}
                                    scale="scale-100"
                                    imageFormat="webp"
                                    className="z-10"
                                    />
                                </div>
                            </button>
                            <button className="rotate-[8.46deg] z-[2] [--rotate:15.85deg] group/button pointer-events-auto h-[200px] w-[200px] min-w-[200px] rounded-xl p-3 transition-transform duration-300 hover:rotate-[-0.5deg] bg-neutral-800 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.1)] cursor-pointer">
                                <div className="relative flex h-full w-full items-center justify-center rounded-lg transition-all duration-300 after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-lg after:border after:border-[rgba(0,0,0,0.05)] group-hover/button:bg-white/[0.02]"></div>
                            </button>
                            <button className="rotate-[-6.25deg] [x--:-190px] [--rotate:15deg] group/button pointer-events-auto h-[200px] w-[200px] min-w-[200px] rounded-xl p-3 transition-transform duration-300 hover:rotate-[-0.5deg] bg-neutral-800 shadow-[0px_0px_0px_2px_rgba(255,255,255,0.1)] cursor-pointer">
                                <div className="relative flex h-full w-full items-center justify-center rounded-lg transition-all duration-300 after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-lg after:border after:border-[rgba(0,0,0,0.05)] group-hover/button:bg-white/[0.02]"></div>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex flex-row items-center justify-center gap-3 flex-wrap w-full">
                                {selectedFiles.map((file, index) => {
                                    const FileIcon = getFileIcon(file);
                                    const previewUrl = filePreviews[index];
                                    const hasPreview = !!previewUrl;
                                    
                                    return (
                                        <div
                                            key={index}
                                            className="relative flex flex-col items-center justify-center w-26 h-26 md:w-40 md:h-40 bg-white/10 rounded-lg group overflow"
                                        >
                                            <button
                                                onClick={() => handleRemoveFile(index)}
                                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                aria-label="Remove file"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                            {hasPreview ? (
                                                <div className="relative w-full h-full">
                                                    <img
                                                        src={previewUrl}
                                                        alt={file.name}
                                                        className="w-full h-full object-cover rounded"
                                                    />
                                                    <div className="absolute bottom-1 left-1 flex items-center gap-1.5">
                                                        {file.type?.startsWith('image/') && (
                                                            <Image className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                                                        )}
                                                        {file.type?.startsWith('video/') && (
                                                            <>
                                                                <Video className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                                                                {fileDurations[index] && (
                                                                    <span className="text-white text-xs font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                                                        {formatDuration(fileDurations[index])}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                        {file.type?.startsWith('audio/') && (
                                                            <>
                                                                <Music className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                                                                {fileDurations[index] && (
                                                                    <span className="text-white text-xs font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                                                        {formatDuration(fileDurations[index])}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center w-full h-full gap-1">
                                                    <FileIcon className="w-8 h-8 text-white/70" />
                                                    <span className="text-white/70 text-[10px] md:text-[14px] text-center font-semibold truncate w-full px-1 mt-0.5" title={file.name}>
                                                        {file.name.length > 12 ? `${file.name.substring(0, 12)}...` : file.name}
                                                    </span>
                                                    <span className="text-white/50 text-[8px] text-center truncate w-full px-1">
                                                        {getFileTypeName(file)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {selectedFiles.length < MAX_FILES && (
                                    <button
                                        onClick={handleButtonClick}
                                        className="flex flex-col items-center justify-center w-26 h-26 md:w-40 md:h-40 bg-transparent border-2 border-white/30 border-dashed rounded-lg hover:bg-white/10 hover:border-white/50 transition-all duration-100 cursor-pointer"
                                        aria-label="Add more files"
                                    >
                                        <Plus className="w-8 h-8 text-white/30" />
                                    </button>
                                )}
                            </div>
                            {selectedFiles.length < MAX_FILES && (
                                <div className="text-white/50 text-xs text-center">
                                    {MAX_FILES - selectedFiles.length} more file{MAX_FILES - selectedFiles.length !== 1 ? 's' : ''} can be added
                                </div>
                            )}
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="*/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>
                )}

                {!isUploading && showPriceSection && (
                    <div className={cn(
                        "flex flex-col gap-2 text-center transition-opacity duration-500",
                        showPriceSection ? "opacity-100" : "opacity-0"
                    )}>
                        <MaskInput 
                            className="!text-7xl md:!text-5xl font-semibold text-white/70 bg-transparent !border-none !outline-none text-center focus:!border-none focus:!ring-0 focus:!ring-offset-0 !h-auto" 
                            mask="currency" 
                            placeholder="$5.00"
                            onValueChange={handlePriceChange}
                        />
                        <div 
                            key={shimmerKey}
                            data-text={isValidPrice() ? getPriceMessage() : ''}
                            className={cn(
                                "font-semibold text-md",
                                price && parseFloat(price.replace(/[^0-9.]/g, '')) < 5.00 
                                    ? "text-red-400/80" 
                                    : isValidPrice() 
                                        ? "shimmer-text" 
                                        : "text-white/50"
                            )}
                        >
                            {getPriceMessage()}
                        </div>

                        <button 
                            onClick={handleCreateLink}
                            disabled={!isValidPrice() || selectedFiles.length === 0}
                            className={cn(
                                "mt-4 w-1/2 mx-auto rounded-full font-semibold py-3 px-4 transition-all duration-100",
                                isValidPrice() && selectedFiles.length > 0
                                    ? "bg-white text-black hover:bg-white/90 cursor-pointer"
                                    : "bg-white/10 text-white/30 cursor-not-allowed"
                            )}
                        >
                            Create Link
                        </button>
                    </div>
                )}

                {isUploading && selectedFiles.length > 0 && currentUploadIndex < selectedFiles.length && (
                    <div className="flex flex-col items-center gap-6 w-full animate-in fade-in duration-500">
                        {/* Large file preview in center */}
                        <div className="flex items-center justify-center w-64 h-64 md:w-80 md:h-80">
                            {(() => {
                                const currentFile = selectedFiles[currentUploadIndex];
                                if (!currentFile) return null;
                                
                                const FileIcon = getFileIcon(currentFile);
                                const previewUrl = filePreviews[currentUploadIndex];
                                const hasPreview = !!previewUrl;
                                
                                return (
                                    <div 
                                        key={currentUploadIndex}
                                        className="relative w-full h-full bg-white/10 border border-white/30 rounded-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
                                    >
                                        {hasPreview ? (
                                            <div className="relative w-full h-full">
                                                <img
                                                    src={previewUrl}
                                                    alt={currentFile.name}
                                                    className="w-full h-full object-cover rounded"
                                                />
                                                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                                                    {currentFile.type?.startsWith('image/') && (
                                                        <Image className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                                                    )}
                                                    {currentFile.type?.startsWith('video/') && (
                                                        <>
                                                            <Video className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                                                            {fileDurations[currentUploadIndex] && (
                                                                <span className="text-white text-sm font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                                                    {formatDuration(fileDurations[currentUploadIndex])}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                    {currentFile.type?.startsWith('audio/') && (
                                                        <>
                                                            <Music className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                                                            {fileDurations[currentUploadIndex] && (
                                                                <span className="text-white text-sm font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                                                    {formatDuration(fileDurations[currentUploadIndex])}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center w-full h-full gap-2">
                                                <FileIcon className="w-24 h-24 text-white/70" />
                                                <span className="text-white/70 text-sm text-center font-semibold truncate w-full px-2" title={currentFile.name}>
                                                    {currentFile.name.length > 20 ? `${currentFile.name.substring(0, 20)}...` : currentFile.name}
                                                </span>
                                                <span className="text-white/50 text-xs text-center">
                                                    {getFileTypeName(currentFile)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Upload progress bar */}
                        <div className="w-1/2 flex flex-col gap-2">
                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                <div 
                                    className="bg-white h-full transition-all duration-100 ease-linear rounded-full"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                            <div className="text-white/50 text-sm text-center">
                                Uploading {currentUploadIndex + 1} of {selectedFiles.length} - {uploadProgress}%
                            </div>
                        </div>
                    </div>
                )}

                {uploadComplete && selectedFiles.length > 0 && (
                    <div className="flex flex-col items-center gap-6 w-full animate-in fade-in duration-500">
                        {/* Large file preview in center */}
                        <div className="flex items-center justify-center w-64 h-64 md:w-80 md:h-80">
                            {(() => {
                                const firstFile = selectedFiles[0];
                                if (!firstFile) return null;
                                
                                const FileIcon = getFileIcon(firstFile);
                                
                                // Use cover photo URL (blurred version) if available
                                // Otherwise try blurredS3Url from files data, then fallback to local preview
                                const firstUploadedFile = uploadedFilesData[0];
                                const blurredS3Url = firstUploadedFile?.blurredS3Url;
                                
                                // Priority: coverPhotoUrl > blurredS3Url > local preview
                                const previewUrl = coverPhotoUrl || blurredS3Url || filePreviews[0] || null;
                                const hasPreview = !!previewUrl;
                                
                                console.log("Preview URL sources:", {
                                    coverPhotoUrl,
                                    blurredS3Url,
                                    localPreview: filePreviews[0],
                                    finalPreviewUrl: previewUrl
                                });
                                
                                return (
                                    <div className="relative w-full h-full bg-white/10 rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                                        {hasPreview ? (
                                            <div className="relative w-full h-full">
                                                <img
                                                    src={previewUrl!}
                                                    alt={firstFile.name}
                                                    className="w-full h-full object-cover rounded-lg pointer-events-none"
                                                />
                         
                                            </div>
                                        ) : (
                                            <NoPreview />
                                        )}
                                        <LinkCoverOverlay 
                                            variant="compact"
                                            price="$5.00"
                                            className="p-2"
                                        />
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="flex flex-col gap-3 w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                            <button 
                                onClick={handleCopyLink}
                                className={cn(
                                    "flex items-center justify-center gap-2 rounded-full font-semibold py-3 px-6 transition-all duration-200",
                                    "bg-white/10 border border-white/30 text-white hover:bg-white/20 hover:border-white/50 cursor-pointer"
                                )}
                            >
                                {linkCopied ? (
                                    <>
                                        <Check className="w-5 h-5" />
                                        <span className="text-sm">Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-5 h-5" />
                                        <span className="font-mono text-sm">{generatedLink}</span>
                                    </>
                                )}
                            </button>
                            <button 
                                onClick={handleShare}
                                className={cn(
                                    "flex items-center justify-center gap-2 rounded-full font-semibold py-3 px-6 transition-all duration-200",
                                    "bg-white text-black hover:bg-white/90 cursor-pointer"
                                )}
                            >
                                <Share2 className="w-5 h-5" />
                                <span>Share</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <NeedsOnboardingModal
                open={showNeedsOnboardingModal}
                onOpenChange={setShowNeedsOnboardingModal}
            />
       </div>
    )
}
{/*}
                        <button 
                            onClick={handleButtonClick}
                            className={cn(
                                "flex flex-col w-[200px] h-[200px] bg-transparent border-2 border-white/30 border-dashed rounded-lg items-center justify-center",
                                "hover:bg-white/10 hover:border-white/50 transition-all duration-100 cursor-pointer"
                            )}
                        >
                            <Plus className="w-24 h-24 text-white/30" />
                        </button>
                        {*/}