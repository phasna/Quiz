"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_s3_1 = require("@aws-sdk/client-s3");
const driver = process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local';
const uploadsDir = path_1.default.join(process.cwd(), 'public', 'uploads');
fs_1.default.mkdirSync(uploadsDir, { recursive: true });
let s3Client = null;
let bucketReady = null;
function getS3Client() {
    if (s3Client)
        return s3Client;
    s3Client = new client_s3_1.S3Client({
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
    if (bucketReady)
        return bucketReady;
    bucketReady = (async () => {
        const client = getS3Client();
        const bucket = process.env.S3_BUCKET;
        try {
            await client.send(new client_s3_1.HeadBucketCommand({ Bucket: bucket }));
        }
        catch (err) {
            await client.send(new client_s3_1.CreateBucketCommand({ Bucket: bucket }));
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
        await client.send(new client_s3_1.PutBucketPolicyCommand({
            Bucket: bucket,
            Policy: JSON.stringify(publicReadPolicy)
        }));
    })();
    return bucketReady;
}
async function saveFile(buffer, filename, mimeType) {
    if (driver === 's3') {
        await ensureBucket();
        await getS3Client().send(new client_s3_1.PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: filename,
            Body: buffer,
            ContentType: mimeType
        }));
        return `${process.env.S3_PUBLIC_URL}/${process.env.S3_BUCKET}/${filename}`;
    }
    fs_1.default.writeFileSync(path_1.default.join(uploadsDir, filename), buffer);
    return `/uploads/${filename}`;
}
async function getBuffer(filename) {
    if (driver === 's3') {
        await ensureBucket();
        const response = await getS3Client().send(new client_s3_1.GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: filename
        }));
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }
    return fs_1.default.promises.readFile(path_1.default.join(uploadsDir, filename));
}
async function deleteFile(filename) {
    if (driver === 's3') {
        await ensureBucket();
        await getS3Client().send(new client_s3_1.DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: filename
        }));
        return;
    }
    await fs_1.default.promises.rm(path_1.default.join(uploadsDir, filename), { force: true });
}
exports.default = { driver, saveFile, getBuffer, deleteFile };
