import { CreateBucketCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ImportExportStorageService {
  private readonly client: S3Client;
  private readonly ensuredBuckets = new Set<string>();

  constructor(private readonly configService: ConfigService) {
    this.client = new S3Client({
      region: this.configService.get<string>('MINIO_REGION', 'us-east-1'),
      endpoint: this.configService.get<string>('MINIO_ENDPOINT', 'http://localhost:9000'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.get<string>('MINIO_ACCESS_KEY', 'promptbase'),
        secretAccessKey: this.configService.get<string>('MINIO_SECRET_KEY', 'promptbase123'),
      },
    });
  }

  async uploadObject(bucket: string, key: string, body: Buffer, contentType: string) {
    await this.ensureBucket(bucket);
    await this.client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    return `s3://${bucket}/${key}`;
  }

  async downloadObject(uri: string) {
    const { bucket, key } = this.parseUri(uri);
    const response = await this.client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await response.Body?.transformToByteArray();
    return Buffer.from(bytes ?? []);
  }

  private async ensureBucket(bucket: string) {
    if (this.ensuredBuckets.has(bucket)) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
    this.ensuredBuckets.add(bucket);
  }

  private parseUri(uri: string) {
    if (!uri.startsWith('s3://')) throw new Error(`Unsupported object uri: ${uri}`);
    const normalized = uri.slice(5);
    const slashIndex = normalized.indexOf('/');
    if (slashIndex < 0) throw new Error(`Invalid object uri: ${uri}`);
    return { bucket: normalized.slice(0, slashIndex), key: normalized.slice(slashIndex + 1) };
  }
}
