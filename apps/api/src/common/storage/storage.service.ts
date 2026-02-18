import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client | null = null;
  private bucket: string;
  private publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.get('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get('R2_SECRET_ACCESS_KEY');
    this.bucket = this.config.get('R2_BUCKET', 'torque360');
    this.publicUrl = this.config.get('R2_PUBLIC_URL', '');

    if (accountId && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log('Cloudflare R2 storage configured');
    } else {
      this.logger.warn('R2 not configured. File uploads will fail gracefully.');
    }
  }

  get isAvailable(): boolean {
    return this.client !== null;
  }

  // ── Upload ────────────────────────────────────────────────────────────

  async upload(
    key: string,
    body: Buffer | Readable,
    contentType: string,
  ): Promise<UploadResult | null> {
    if (!this.client) {
      this.logger.warn(`Upload skipped (no R2): ${key}`);
      return null;
    }

    const size = Buffer.isBuffer(body) ? body.length : 0;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    const url = this.publicUrl
      ? `${this.publicUrl}/${key}`
      : `https://${this.bucket}.r2.dev/${key}`;

    this.logger.log(`Uploaded: ${key} (${size} bytes)`);
    return { key, url, size };
  }

  // ── Tenant-scoped upload ──────────────────────────────────────────────

  async uploadForTenant(
    tenantId: string,
    folder: string,
    filename: string,
    body: Buffer | Readable,
    contentType: string,
  ): Promise<UploadResult | null> {
    const key = `${tenantId}/${folder}/${filename}`;
    return this.upload(key, body, contentType);
  }

  // ── Download ──────────────────────────────────────────────────────────

  async download(key: string): Promise<Buffer | null> {
    if (!this.client) return null;

    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (err) {
      this.logger.error(`Download error [${key}]: ${(err as Error).message}`);
      return null;
    }
  }

  // ── Signed URLs ───────────────────────────────────────────────────────

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string | null> {
    if (!this.client) return null;

    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  // ── Delete ────────────────────────────────────────────────────────────

  async delete(key: string): Promise<void> {
    if (!this.client) return;

    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Deleted: ${key}`);
  }

  // ── List ──────────────────────────────────────────────────────────────

  async listByPrefix(prefix: string, maxKeys = 100): Promise<string[]> {
    if (!this.client) return [];

    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      }),
    );

    return (response.Contents || []).map((obj) => obj.Key!).filter(Boolean);
  }
}
