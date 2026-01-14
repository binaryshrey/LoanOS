import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

export async function POST(req: Request) {
  try {
    const { bucketName, objectPath, expiresInMinutes = 60 } = await req.json();

    if (!bucketName || !objectPath) {
      return NextResponse.json(
        { error: "bucketName and objectPath are required" },
        { status: 400 }
      );
    }

    // Initialize Storage client
    const storageOptions: any = {
      projectId: process.env.GCP_PROJECT_ID,
    };

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      storageOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    } else if (process.env.GCP_CREDENTIALS_BASE64) {
      try {
        const decodedKey = Buffer.from(
          process.env.GCP_CREDENTIALS_BASE64,
          "base64"
        ).toString("utf-8");
        storageOptions.credentials = JSON.parse(decodedKey);
      } catch (parseError) {
        console.error("Failed to parse GCP_CREDENTIALS_BASE64:", parseError);
        throw new Error("Invalid GCP credentials");
      }
    }

    const storage = new Storage(storageOptions);
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectPath);

    // Generate signed URL for reading
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return NextResponse.json({ signedUrl });
  } catch (err: any) {
    console.error("Error generating signed URL:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to generate signed URL" },
      { status: 500 }
    );
  }
}
