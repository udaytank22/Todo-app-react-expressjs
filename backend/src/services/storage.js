const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

const bucketName = process.env.S3_BUCKET;
const region = process.env.AWS_REGION || 'us-east-1';

let s3Client = null;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && bucketName) {
  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  console.log('[Storage Service] Initialized S3 storage.');
} else {
  console.log('[Storage Service] AWS credentials not found. Using local disk fallback.');
}

/**
 * Uploads a file buffer either to S3 or local disk.
 * @param {Buffer} buffer File contents
 * @param {string} filename Original or generated filename
 * @returns {Promise<string>} The storage path or object key
 */
const uploadFile = async (buffer, filename) => {
  if (s3Client) {
    const key = `uploads/${Date.now()}-${filename}`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
    });
    await s3Client.send(command);
    return key;
  } else {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(filename)}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    await fs.promises.writeFile(filePath, buffer);
    return `uploads/${uniqueFilename}`;
  }
};

/**
 * Gets a presigned URL (S3) or constructs local static URL.
 * @param {string} keyOrPath The storage key or local file path
 * @returns {Promise<string>} URL
 */
const getFileUrl = async (keyOrPath) => {
  if (s3Client && keyOrPath.startsWith('uploads/') && !keyOrPath.includes('\\')) {
    // Attempt S3 presigned URL
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: keyOrPath,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return url;
  } else {
    // Local fallback
    return `/${keyOrPath}`;
  }
};

/**
 * Fetches the file contents into a buffer for processing (e.g. AI parsing).
 * @param {string} keyOrPath The storage key or local file path
 * @returns {Promise<Buffer>}
 */
const getFileBuffer = async (keyOrPath) => {
  if (s3Client && keyOrPath.startsWith('uploads/') && !keyOrPath.includes('\\')) {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: keyOrPath,
    });
    const { Body } = await s3Client.send(command);
    const streamToBuffer = (stream) =>
      new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    return await streamToBuffer(Body);
  } else {
    const filePath = path.join(__dirname, '../../', keyOrPath);
    return await fs.promises.readFile(filePath);
  }
};

module.exports = {
  uploadFile,
  getFileUrl,
  getFileBuffer,
};
