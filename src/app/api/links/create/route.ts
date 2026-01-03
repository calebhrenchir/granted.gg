import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadFileToS3, uploadBlurredImage, uploadBlurredVideoThumbnail, getS3Url } from "@/lib/s3";
import { randomBytes } from "crypto";
import { COVER_COLORS } from "@/lib/constants/cover-colors";

// Word lists for generating friendly URLs
const ADJECTIVES = [
  "happy", "bright", "cool", "swift", "bold", "calm", "clever", "daring", "eager", "fancy",
  "gentle", "jolly", "lively", "mighty", "noble", "proud", "quick", "radiant", "smooth", "tidy",
  "vivid", "witty", "zesty", "brave", "calm", "dizzy", "eager", "fierce", "gloomy", "happy",
  "jolly", "kind", "lazy", "merry", "neat", "odd", "proud", "quiet", "rapid", "sharp",
  "tall", "vivid", "warm", "young", "zany", "blue", "red", "green", "gold", "silver",
  "purple", "pink", "orange", "yellow", "black", "white", "gray", "brown", "crimson", "azure"
];

const NOUNS = [
  "apple", "banana", "berry", "cherry", "grape", "kiwi", "lemon", "mango", "orange", "peach",
  "pear", "plum", "strawberry", "watermelon", "whale", "dolphin", "shark", "tiger", "lion", "bear",
  "eagle", "hawk", "owl", "raven", "swan", "dove", "sparrow", "robin", "cardinal", "bluebird",
  "ocean", "river", "lake", "mountain", "valley", "forest", "desert", "island", "beach", "cliff",
  "star", "moon", "sun", "cloud", "rainbow", "storm", "breeze", "wave", "crystal", "diamond",
  "pearl", "ruby", "emerald", "sapphire", "amber", "jade", "opal", "topaz", "garnet", "quartz",
  "comet", "planet", "galaxy", "nebula", "meteor", "asteroid", "cosmos", "universe", "stardust", "aurora"
];

function generateUniqueUrl(): string {
  // Generate a friendly URL with 2-3 random words
  const numWords = Math.floor(Math.random() * 2) + 2; // 2 or 3 words
  const words: string[] = [];
  
  // Always start with an adjective
  words.push(ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]);
  
  // Add 1-2 nouns
  for (let i = 0; i < numWords - 1; i++) {
    words.push(NOUNS[Math.floor(Math.random() * NOUNS.length)]);
  }
  
  return words.join("-");
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to create a link." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const price = formData.get("price") as string;
    const files = formData.getAll("files") as File[];

    if (!price || files.length === 0) {
      return NextResponse.json(
        { error: "Price and files are required" },
        { status: 400 }
      );
    }

    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ""));
    if (isNaN(numericPrice) || numericPrice < 5.0) {
      return NextResponse.json(
        { error: "Price must be at least $5.00" },
        { status: 400 }
      );
    }

    // Generate unique URL
    let uniqueUrl: string;
    let urlExists = true;
    while (urlExists) {
      uniqueUrl = generateUniqueUrl();
      const existingLink = await prisma.link.findUnique({
        where: { url: uniqueUrl },
      });
      urlExists = !!existingLink;
    }

    // Create link in database
    const link = await prisma.link.create({
      data: {
        url: uniqueUrl!,
        price: numericPrice,
        userId: session.user.id,
      },
    });

    // Upload files and create file records
    const uploadedFiles = [];
    let coverPhotoS3Key: string | null = null;
    let firstMediaFound = false; // Changed from firstImageFound to handle both images and videos

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = randomBytes(8).toString("hex");
      const fileExtension = file.name.split(".").pop() || "";
      const s3Key = `links/${link.id}/${fileId}.${fileExtension}`;

      // Upload original file
      await uploadFileToS3(file, s3Key);

      let blurredS3Key: string | null = null;
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isFirstMedia = (isImage || isVideo) && !firstMediaFound;

      // Upload blurred version if it's an image
      if (isImage) {
        try {
          blurredS3Key = await uploadBlurredImage(file, s3Key);
          console.log(`Created blurred version for ${file.name}: ${blurredS3Key}`);
          
          // Set first image's blurred version as cover photo
          if (isFirstMedia) {
            coverPhotoS3Key = blurredS3Key;
            firstMediaFound = true;
            console.log(`Set cover photo to blurred version: ${blurredS3Key}`);
          }
        } catch (error) {
          console.error(`Failed to create blurred version for ${file.name}:`, error);
          // Continue without blurred version - original will be used
        }
      } 
      // Upload blurred thumbnail if it's a video
      else if (isVideo) {
        try {
          blurredS3Key = await uploadBlurredVideoThumbnail(file, s3Key);
          if (blurredS3Key) {
            console.log(`Created blurred video thumbnail for ${file.name}: ${blurredS3Key}`);
            
            // Set first video's blurred thumbnail as cover photo
            if (isFirstMedia) {
              coverPhotoS3Key = blurredS3Key;
              firstMediaFound = true;
              console.log(`Set cover photo to blurred video thumbnail: ${blurredS3Key}`);
            }
          } else {
            console.warn(`Could not create blurred video thumbnail for ${file.name} - ffmpeg may not be available`);
          }
        } catch (error) {
          console.error(`Failed to create blurred video thumbnail for ${file.name}:`, error);
          // Continue without blurred version - original will be used
        }
      }

      // Create file record with blurredS3Key (null for non-media or if blur creation failed)
      // Set isCoverPhoto to true for the first image or video file
      const isCoverPhoto = isFirstMedia && blurredS3Key !== null;
      const fileRecord = await prisma.file.create({
        data: {
          name: file.name,
          mimeType: file.type,
          size: file.size,
          s3Key,
          blurredS3Key, // This will be null for non-media or if blur creation failed
          isCoverPhoto,
          isPreviewable: false, // Default to false, user can set it later
          linkId: link.id,
        },
      });
      
      console.log(`Created file record: ${fileRecord.id} with blurredS3Key: ${blurredS3Key || 'none'}`);

      uploadedFiles.push(fileRecord);
    }

    // Update link with cover photo (blurred version of first image) or random color
    if (coverPhotoS3Key) {
      await prisma.link.update({
        where: { id: link.id },
        data: { coverPhotoS3Key },
      });
      console.log(`Updated link ${link.id} with cover photo: ${coverPhotoS3Key}`);
    } else {
      // Assign a random color from COVER_COLORS if no cover photo
      const randomColor = COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)];
      await prisma.link.update({
        where: { id: link.id },
        data: { coverColor: randomColor },
      });
      console.log(`Updated link ${link.id} with cover color: ${randomColor}`);
    }

    // Include S3 URLs in the response
    const filesWithUrls = uploadedFiles.map((file) => {
      const blurredUrl = file.blurredS3Key ? getS3Url(file.blurredS3Key) : null;
      console.log(`File ${file.name}: blurredS3Key=${file.blurredS3Key}, blurredS3Url=${blurredUrl}`);
      return {
        ...file,
        s3Url: getS3Url(file.s3Key),
        blurredS3Url: blurredUrl,
      };
    });

    const coverPhotoUrl = coverPhotoS3Key ? getS3Url(coverPhotoS3Key) : null;
    
    // Fetch the updated link to get the coverColor if it was set
    const updatedLink = await prisma.link.findUnique({
      where: { id: link.id },
      select: { coverColor: true },
    });
    
    console.log(`Cover photo: coverPhotoS3Key=${coverPhotoS3Key}, coverPhotoS3Url=${coverPhotoUrl}, coverColor=${updatedLink?.coverColor}`);

    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        url: link.url,
        price: link.price,
        coverPhotoS3Url: coverPhotoUrl,
        coverColor: updatedLink?.coverColor || null,
      },
      files: filesWithUrls,
    });
  } catch (error) {
    console.error("Error creating link:", error);
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500 }
    );
  }
}
