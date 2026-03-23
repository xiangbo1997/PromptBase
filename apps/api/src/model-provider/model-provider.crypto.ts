import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

@Injectable()
export class ModelProviderCryptoService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
  }

  decrypt(value: string): string {
    const [ivBase64, authTagBase64, encryptedBase64] = value.split('.');
    if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
      throw new InternalServerErrorException('Invalid encrypted model provider secret');
    }

    const decipher = createDecipheriv('aes-256-gcm', this.getKey(), Buffer.from(ivBase64, 'base64'));
    decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedBase64, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  private getKey(): Buffer {
    // 兼容旧环境：未单独配置模型密钥时，回退到现有 JWT_SECRET，避免管理接口直接 500。
    const secret =
      this.configService.get<string>('MODEL_KEY_SECRET') ??
      this.configService.get<string>('JWT_SECRET');

    if (!secret || secret.trim().length === 0) {
      throw new InternalServerErrorException('MODEL_KEY_SECRET or JWT_SECRET must be configured');
    }

    return createHash('sha256').update(secret).digest();
  }
}
