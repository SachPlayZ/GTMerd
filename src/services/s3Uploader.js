// src/services/s3Uploader.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/index.js';

const s3 = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

/**
 * Upload a PDF buffer to S3 and return the public URL.
 * @param {Buffer} pdfBuffer - The PDF file content
 * @param {string} fileName - The S3 object key (e.g., "gtm-stripe-uuid.pdf")
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
export async function uploadToS3(pdfBuffer, fileName) {
  const command = new PutObjectCommand({
    Bucket: config.aws.bucketName,
    Key: fileName,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
    // Note: Remove ContentDisposition if you want the browser to render inline
    ContentDisposition: `attachment; filename="${fileName}"`,
  });

  await s3.send(command);

  // Build the public URL
  const baseUrl =
    config.aws.publicBaseUrl ||
    `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com`;

  return `${baseUrl}/${fileName}`;
}
