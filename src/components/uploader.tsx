"use client";

import { useUploadFiles } from "better-upload/client";
import { UploadDropzone } from "./ui/upload-dropzone";

export function Uploader() {
    const { control } = useUploadFiles({
        route: "demo"
    });

    return (
        <UploadDropzone
        control={control}
        accept="image/*"
        description={{
            maxFiles: 4,
            maxFileSize: '5MB',
            fileTypes: 'JPEG, PNG, GIF',
        }}
        />
    )
}