// src/config/index.js
import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  gemini: {
    apiKey: required('GEMINI_API_KEY'),
  },
  aws: {
    region: required('AWS_REGION'),
    accessKeyId: required('AWS_ACCESS_KEY_ID'),
    secretAccessKey: required('AWS_SECRET_ACCESS_KEY'),
    bucketName: required('S3_BUCKET_NAME'),
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || null,
  },
};
