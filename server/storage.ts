import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

let _s3: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: ENV.awsRegion,
      credentials: {
        accessKeyId: ENV.awsAccessKeyId,
        secretAccessKey: ENV.awsSecretAccessKey,
      },
    });
  }
  return _s3;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const s3 = getS3Client();
  const key = normalizeKey(relKey);

  const body = typeof data === "string" ? Buffer.from(data) : data;

  await s3.send(
    new PutObjectCommand({
      Bucket: ENV.awsBucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // Generate a presigned URL for immediate access
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: ENV.awsBucketName, Key: key }),
    { expiresIn: 3600 }
  );

  return { key, url };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const s3 = getS3Client();
  const key = normalizeKey(relKey);

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: ENV.awsBucketName, Key: key }),
    { expiresIn: 3600 }
  );

  return { key, url };
}

export async function storageDelete(relKey: string): Promise<void> {
  const s3 = getS3Client();
  const key = normalizeKey(relKey);
  await s3.send(new DeleteObjectCommand({ Bucket: ENV.awsBucketName, Key: key }));
}
