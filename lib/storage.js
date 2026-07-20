const fs = require('fs');
const path = require('path');

const driver = process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local';

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

let s3Client = null;
let bucketReady = null;

function getS3Client() {
  if (s3Client) return s3Client;

  const { S3Client } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY
    }
  });
  return s3Client;
}

// S'assure que le bucket existe et qu'il autorise la lecture publique
// (les images sont consommées directement en <img src>)
async function ensureBucket() {
  if (bucketReady) return bucketReady;

  bucketReady = (async () => {
    const {
      HeadBucketCommand,
      CreateBucketCommand,
      PutBucketPolicyCommand
    } = require('@aws-sdk/client-s3');

    const client = getS3Client();
    const bucket = process.env.S3_BUCKET;

    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch (err) {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    }

    const publicReadPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`]
        }
      ]
    };

    await client.send(new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify(publicReadPolicy)
    }));
  })();

  return bucketReady;
}

async function saveFile(buffer, filename, mimeType) {
  if (driver === 's3') {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await ensureBucket();

    await getS3Client().send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: mimeType
    }));

    return `${process.env.S3_PUBLIC_URL}/${process.env.S3_BUCKET}/${filename}`;
  }

  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}

async function getBuffer(filename) {
  if (driver === 's3') {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    await ensureBucket();

    const response = await getS3Client().send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: filename
    }));

    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  return fs.promises.readFile(path.join(uploadsDir, filename));
}

async function deleteFile(filename) {
  if (driver === 's3') {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    await ensureBucket();

    await getS3Client().send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: filename
    }));
    return;
  }

  await fs.promises.rm(path.join(uploadsDir, filename), { force: true });
}

module.exports = { driver, saveFile, getBuffer, deleteFile };
