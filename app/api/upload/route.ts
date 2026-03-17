import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extracts the Cloudinary public_id from a Cloudinary URL.
 * Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/user-avatars/abc123.jpg
 * Returns: "user-avatars/abc123"
 */
function extractPublicId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const uploadIndex = pathParts.indexOf("upload");
    if (uploadIndex === -1) return null;

    // Parts after 'upload', skip optional version segment (e.g., v1234567890)
    const afterUpload = pathParts.slice(uploadIndex + 1);
    const startIndex = afterUpload[0]?.match(/^v\d+$/) ? 1 : 0;
    const pathWithExt = afterUpload.slice(startIndex).join("/");

    // Remove file extension
    const dotIndex = pathWithExt.lastIndexOf(".");
    return dotIndex !== -1 ? pathWithExt.substring(0, dotIndex) : pathWithExt;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file = data.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary using a stream (efficient for serverless)
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "user-avatars",
          resource_type: "image",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(buffer);
    });

    // After a successful upload, delete the old image if a URL was provided
    const oldImageUrl = data.get("oldImageUrl") as string | null;
    if (oldImageUrl) {
      const oldPublicId = extractPublicId(oldImageUrl);
      if (oldPublicId) {
        try {
          await cloudinary.uploader.destroy(oldPublicId);
          console.log(`Deleted old Cloudinary image: ${oldPublicId}`);
        } catch (deleteError) {
          // Log but don't fail the request — new image was already uploaded successfully
          console.warn("Could not delete old Cloudinary image:", deleteError);
        }
      }
    }

    // Return the secure URL and publicId from Cloudinary
    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json(
      { success: false, error: "Upload failed due to server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "No imageUrl provided" },
        { status: 400 }
      );
    }

    const publicId = extractPublicId(imageUrl);
    if (!publicId) {
      return NextResponse.json(
        { success: false, error: "Could not determine public_id from URL" },
        { status: 400 }
      );
    }

    await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted Cloudinary image: ${publicId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return NextResponse.json(
      { success: false, error: "Delete failed due to server error." },
      { status: 500 }
    );
  }
}