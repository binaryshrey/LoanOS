/**
 * Generate a signed URL for accessing a GCS object
 *
 * @param bucketName - The GCS bucket name
 * @param objectPath - The path to the object in the bucket
 * @param expiresInMinutes - How long the URL should be valid (default: 60 minutes)
 * @returns Promise with signed URL
 */
export async function getSignedUrl(
  bucketName: string,
  objectPath: string,
  expiresInMinutes: number = 60
) {
  try {
    const response = await fetch("/api/gcs/signed-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucketName,
        objectPath,
        expiresInMinutes,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate signed URL");
    }

    const data = await response.json();
    return data.signedUrl;
  } catch (error) {
    console.error("Error getting signed URL:", error);
    throw error;
  }
}
