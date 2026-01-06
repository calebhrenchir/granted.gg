import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile, access } from "fs/promises";
import { constants } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

// Validate and get AWS region
function getAwsRegion(): string {
  const region = process.env.AWS_REGION?.trim();
  
  // If region is empty or undefined, use default (us-east-2 based on bucket location)
  if (!region || region === "") {
    return "us-east-2";
  }
  
  // Validate region format (AWS regions are lowercase alphanumeric with hyphens)
  // Examples: us-east-1, eu-west-1, ap-southeast-2
  const regionPattern = /^[a-z0-9-]+$/;
  if (!regionPattern.test(region)) {
    console.error(`Invalid AWS_REGION format: "${region}". Using default: us-east-2`);
    return "us-east-2";
  }
  
  return region;
}

const AWS_REGION = getAwsRegion();

export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

// Map file extensions to MIME types (for cases where browser doesn't provide correct type)
const MIME_TYPE_MAP: { [key: string]: string } = {
  // Audio
  'wav': 'audio/wav',
  'wave': 'audio/wav',
  'mp3': 'audio/mpeg',
  'm4a': 'audio/mp4',
  'aac': 'audio/aac', 
  'ogg': 'audio/ogg',
  'oga': 'audio/ogg',
  'flac': 'audio/flac',
  'wma': 'audio/x-ms-wma',
  // Video
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'mov': 'video/quicktime',
  'avi': 'video/x-msvideo',
  'mkv': 'video/x-matroska',
  // Images
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  // Documents
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'txt': 'text/plain',
  'csv': 'text/csv',
};

function getContentType(file: File, key: string): string {
  // If browser provided a valid MIME type, use it
  if (file.type && file.type !== 'application/octet-stream' && file.type !== '') {
    return file.type;
  }

  // Otherwise, try to determine from file extension
  const extension = key.split('.').pop()?.toLowerCase() || '';
  if (extension && MIME_TYPE_MAP[extension]) {
    return MIME_TYPE_MAP[extension];
  }

  // Default fallback
  return file.type || 'application/octet-stream';
}

export async function uploadFileToS3(
  file: File,
  key: string
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const contentType = getContentType(file, key);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return key;
}

export async function uploadBlurredImage(
  file: File,
  key: string
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Create blurred version using sharp
  // Resize to small size and apply blur for performance and privacy
  const blurredBuffer = await sharp(buffer)
  .resize(120, 120, { fit: "inside" })
  .blur(6)
  .jpeg({ quality: 100 })
  .toBuffer();

  // Generate blurred key by appending -blurred before the file extension
  const blurredKey = key.replace(/\.[^/.]+$/, "-blurred.jpg");

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: blurredKey,
    Body: blurredBuffer,
    ContentType: "image/jpeg", // Always JPEG for blurred versions
  });

  await s3Client.send(command);
  console.log(`Uploaded blurred image to S3: ${blurredKey}`);
  return blurredKey;
}

export async function uploadBlurredVideoThumbnail(
  file: File,
  key: string
): Promise<string | null> {
  console.log(`[uploadBlurredVideoThumbnail] Called for file: ${file.name}, key: ${key}`);
  
  // Check if it's a video by MIME type or file extension
  const isVideoByType = file.type.startsWith("video/");
  const isVideoByExtension = /\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv)$/i.test(file.name);
  
  if (!isVideoByType && !isVideoByExtension) {
    console.warn(`File ${file.name} with type ${file.type} is not detected as a video`);
    throw new Error("File must be a video");
  }
  
  console.log(`[uploadBlurredVideoThumbnail] Video detection: MIME type=${file.type}, isVideoByType=${isVideoByType}, isVideoByExtension=${isVideoByExtension}`);

  // Check if ffmpeg is available first
  console.log(`[uploadBlurredVideoThumbnail] Checking if ffmpeg is available...`);
  try {
    const ffmpegVersion = await execAsync("ffmpeg -version");
    console.log(`[uploadBlurredVideoThumbnail] FFmpeg is available: ${ffmpegVersion.stdout.substring(0, 50)}...`);
  } catch (error) {
    console.error(`[uploadBlurredVideoThumbnail] FFmpeg is not available:`, error);
    console.warn("FFmpeg is not available, skipping video thumbnail generation");
    return null;
  }

  // Create temporary files for processing
  const tempDir = tmpdir();
  // Get file extension from file name, fallback to key if needed
  const fileExtension = file.name.split('.').pop() || key.split('.').pop() || 'mp4';
  const tempVideoPath = join(tempDir, `video-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`);
  const tempThumbnailPath = join(tempDir, `thumb-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`);

  try {
    console.log(`Starting video thumbnail generation for ${file.name}, temp path: ${tempVideoPath}`);
    
    // Write video file to temp location
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(tempVideoPath, buffer);
    console.log(`Video file written to temp location: ${tempVideoPath}`);

    // Extract thumbnail at 1 second using ffmpeg
    try {
      await execAsync(
        `ffmpeg -i "${tempVideoPath}" -ss 00:00:01 -vframes 1 -vf "scale=120:120:force_original_aspect_ratio=decrease" "${tempThumbnailPath}" -y`
      );
      console.log(`Thumbnail extracted successfully to: ${tempThumbnailPath}`);
    } catch (ffmpegError) {
      // If ffmpeg fails, try alternative approach or use first frame
      console.warn(`First ffmpeg attempt failed, trying alternative: ${ffmpegError}`);
      try {
        await execAsync(
          `ffmpeg -i "${tempVideoPath}" -vframes 1 -vf "scale=120:120:force_original_aspect_ratio=decrease" "${tempThumbnailPath}" -y`
        );
        console.log(`Thumbnail extracted successfully (alternative method) to: ${tempThumbnailPath}`);
      } catch (altError) {
        console.error(`FFmpeg failed to extract thumbnail: ${altError}`);
        return null;
      }
    }

    // Check if thumbnail file exists before reading
    try {
      await access(tempThumbnailPath, constants.F_OK);
    } catch (error) {
      console.error(`Thumbnail file does not exist at ${tempThumbnailPath}`);
      return null;
    }

    // Read the thumbnail
    const thumbnailBuffer = await readFile(tempThumbnailPath);
    console.log(`Thumbnail read successfully, size: ${thumbnailBuffer.length} bytes`);

    // Blur the thumbnail using sharp
    const blurredBuffer = await sharp(thumbnailBuffer)
      .blur(6)
      .jpeg({ quality: 100 })
      .toBuffer();
    console.log(`Thumbnail blurred successfully, size: ${blurredBuffer.length} bytes`);

    // Generate blurred key by appending -blurred before the file extension
    const blurredKey = key.replace(/\.[^/.]+$/, "-blurred.jpg");

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: blurredKey,
      Body: blurredBuffer,
      ContentType: "image/jpeg", // Always JPEG for blurred versions
    });

    await s3Client.send(command);
    console.log(`Uploaded blurred video thumbnail to S3: ${blurredKey}`);
    return blurredKey;
  } catch (error) {
    console.error(`Error generating video thumbnail for ${file.name}:`, error);
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
    return null;
  } finally {
    // Clean up temporary files
    try {
      await unlink(tempVideoPath).catch(() => {});
      await unlink(tempThumbnailPath).catch(() => {});
    } catch (error) {
      console.error("Error cleaning up temp files:", error);
    }
  }
}

export async function createVideoPreview(
  originalS3Key: string,
  duration: number = 3
): Promise<string | null> {
  console.log(`[createVideoPreview] Creating ${duration}s preview for ${originalS3Key}`);
  
  // Check if ffmpeg is available
  try {
    await execAsync("ffmpeg -version");
  } catch (error) {
    console.error(`[createVideoPreview] FFmpeg is not available:`, error);
    return null;
  }

  // Create temporary files for processing
  const tempDir = tmpdir();
  const fileExtension = originalS3Key.split('.').pop() || 'mp4';
  const tempInputPath = join(tempDir, `input-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`);
  const tempOutputPath = join(tempDir, `preview-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`);

  try {
    // Download original file from S3
    console.log(`[createVideoPreview] Downloading original file from S3: ${originalS3Key}`);
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: originalS3Key,
    });
    
    const response = await s3Client.send(getCommand);
    if (!response.Body) {
      throw new Error("No file body returned from S3");
    }
    
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);
    await writeFile(tempInputPath, fileBuffer);
    console.log(`[createVideoPreview] Original file downloaded, size: ${fileBuffer.length} bytes`);

    // Extract first N seconds using ffmpeg
    console.log(`[createVideoPreview] Extracting first ${duration} seconds...`);
    try {
      await execAsync(
        `ffmpeg -i "${tempInputPath}" -t ${duration} -c copy "${tempOutputPath}" -y`
      );
      console.log(`[createVideoPreview] Preview extracted successfully`);
    } catch (ffmpegError) {
      // If copy codec fails, try re-encoding
      console.warn(`[createVideoPreview] Copy codec failed, trying re-encode: ${ffmpegError}`);
      try {
        await execAsync(
          `ffmpeg -i "${tempInputPath}" -t ${duration} -c:v libx264 -c:a aac "${tempOutputPath}" -y`
        );
        console.log(`[createVideoPreview] Preview extracted successfully (re-encoded)`);
      } catch (altError) {
        console.error(`[createVideoPreview] FFmpeg failed to extract preview: ${altError}`);
        return null;
      }
    }

    // Check if preview file exists
    try {
      await access(tempOutputPath, constants.F_OK);
    } catch (error) {
      console.error(`[createVideoPreview] Preview file does not exist at ${tempOutputPath}`);
      return null;
    }

    // Read the preview file
    const previewBuffer = await readFile(tempOutputPath);
    console.log(`[createVideoPreview] Preview file read, size: ${previewBuffer.length} bytes`);

    // Generate preview key
    const previewKey = originalS3Key.replace(/\.[^/.]+$/, `-preview.${fileExtension}`);

    // Upload preview to S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: previewKey,
      Body: previewBuffer,
      ContentType: `video/${fileExtension === 'mov' ? 'quicktime' : fileExtension}`,
    });

    await s3Client.send(putCommand);
    console.log(`[createVideoPreview] Preview uploaded to S3: ${previewKey}`);
    return previewKey;
  } catch (error) {
    console.error(`[createVideoPreview] Error creating video preview:`, error);
    if (error instanceof Error) {
      console.error(`[createVideoPreview] Error message: ${error.message}`);
      console.error(`[createVideoPreview] Error stack: ${error.stack}`);
    }
    return null;
  } finally {
    // Clean up temporary files
    try {
      await unlink(tempInputPath).catch(() => {});
      await unlink(tempOutputPath).catch(() => {});
    } catch (error) {
      console.error("[createVideoPreview] Error cleaning up temp files:", error);
    }
  }
}

export async function createAudioPreview(
  originalS3Key: string,
  duration: number = 3
): Promise<string | null> {
  console.log(`[createAudioPreview] Creating ${duration}s preview for ${originalS3Key}`);
  
  // Check if ffmpeg is available
  try {
    await execAsync("ffmpeg -version");
  } catch (error) {
    console.error(`[createAudioPreview] FFmpeg is not available:`, error);
    return null;
  }

  // Create temporary files for processing
  const tempDir = tmpdir();
  const fileExtension = originalS3Key.split('.').pop() || 'mp3';
  const tempInputPath = join(tempDir, `input-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`);
  const tempOutputPath = join(tempDir, `preview-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`);

  try {
    // Download original file from S3
    console.log(`[createAudioPreview] Downloading original file from S3: ${originalS3Key}`);
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: originalS3Key,
    });
    
    const response = await s3Client.send(getCommand);
    if (!response.Body) {
      throw new Error("No file body returned from S3");
    }
    
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);
    await writeFile(tempInputPath, fileBuffer);
    console.log(`[createAudioPreview] Original file downloaded, size: ${fileBuffer.length} bytes`);

    // Extract first N seconds using ffmpeg
    console.log(`[createAudioPreview] Extracting first ${duration} seconds...`);
    try {
      await execAsync(
        `ffmpeg -i "${tempInputPath}" -t ${duration} -c copy "${tempOutputPath}" -y`
      );
      console.log(`[createAudioPreview] Preview extracted successfully`);
    } catch (ffmpegError) {
      // If copy codec fails, try re-encoding
      console.warn(`[createAudioPreview] Copy codec failed, trying re-encode: ${ffmpegError}`);
      try {
        await execAsync(
          `ffmpeg -i "${tempInputPath}" -t ${duration} -c:a libmp3lame "${tempOutputPath}" -y`
        );
        console.log(`[createAudioPreview] Preview extracted successfully (re-encoded)`);
      } catch (altError) {
        console.error(`[createAudioPreview] FFmpeg failed to extract preview: ${altError}`);
        return null;
      }
    }

    // Check if preview file exists
    try {
      await access(tempOutputPath, constants.F_OK);
    } catch (error) {
      console.error(`[createAudioPreview] Preview file does not exist at ${tempOutputPath}`);
      return null;
    }

    // Read the preview file
    const previewBuffer = await readFile(tempOutputPath);
    console.log(`[createAudioPreview] Preview file read, size: ${previewBuffer.length} bytes`);

    // Generate preview key
    const previewKey = originalS3Key.replace(/\.[^/.]+$/, `-preview.${fileExtension}`);

    // Determine content type based on extension
    const contentTypeMap: { [key: string]: string } = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'm4a': 'audio/mp4',
      'aac': 'audio/aac',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac',
    };
    const contentType = contentTypeMap[fileExtension] || 'audio/mpeg';

    // Upload preview to S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: previewKey,
      Body: previewBuffer,
      ContentType: contentType,
    });

    await s3Client.send(putCommand);
    console.log(`[createAudioPreview] Preview uploaded to S3: ${previewKey}`);
    return previewKey;
  } catch (error) {
    console.error(`[createAudioPreview] Error creating audio preview:`, error);
    if (error instanceof Error) {
      console.error(`[createAudioPreview] Error message: ${error.message}`);
      console.error(`[createAudioPreview] Error stack: ${error.stack}`);
    }
    return null;
  } finally {
    // Clean up temporary files
    try {
      await unlink(tempInputPath).catch(() => {});
      await unlink(tempOutputPath).catch(() => {});
    } catch (error) {
      console.error("[createAudioPreview] Error cleaning up temp files:", error);
    }
  }
}

export function getS3Url(key: string): string {
  // Handle different S3 URL formats
  if (BUCKET_NAME.includes(".")) {
    // Path-style URL
    return `https://s3.${AWS_REGION}.amazonaws.com/${BUCKET_NAME}/${key}`;
  } else {
    // Virtual-hosted-style URL
    return `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  }
}

export async function getPresignedS3Url(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}
