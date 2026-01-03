import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";
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
  if (!file.type.startsWith("video/")) {
    throw new Error("File must be a video");
  }

  // Check if ffmpeg is available first
  try {
    await execAsync("ffmpeg -version");
  } catch (error) {
    console.warn("FFmpeg is not available, skipping video thumbnail generation");
    return null;
  }

  // Create temporary files for processing
  const tempDir = tmpdir();
  const tempVideoPath = join(tempDir, `video-${Date.now()}-${Math.random().toString(36).substring(7)}.${key.split('.').pop()}`);
  const tempThumbnailPath = join(tempDir, `thumb-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`);

  try {
    // Write video file to temp location
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(tempVideoPath, buffer);

    // Extract thumbnail at 1 second using ffmpeg
    try {
      await execAsync(
        `ffmpeg -i "${tempVideoPath}" -ss 00:00:01 -vframes 1 -vf "scale=120:120:force_original_aspect_ratio=decrease" "${tempThumbnailPath}" -y`
      );
    } catch (ffmpegError) {
      // If ffmpeg fails, try alternative approach or use first frame
      try {
        await execAsync(
          `ffmpeg -i "${tempVideoPath}" -vframes 1 -vf "scale=120:120:force_original_aspect_ratio=decrease" "${tempThumbnailPath}" -y`
        );
      } catch (altError) {
        console.warn(`FFmpeg failed to extract thumbnail: ${altError}`);
        return null;
      }
    }

    // Read the thumbnail
    const thumbnailBuffer = await readFile(tempThumbnailPath);

    // Blur the thumbnail using sharp
    const blurredBuffer = await sharp(thumbnailBuffer)
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
    console.log(`Uploaded blurred video thumbnail to S3: ${blurredKey}`);
    return blurredKey;
  } catch (error) {
    console.error("Error generating video thumbnail:", error);
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
