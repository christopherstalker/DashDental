import { Injectable } from '@nestjs/common';

@Injectable()
export class EncryptionService {
  encrypt(value: string): string {
    return `enc:${value}`;
  }

  decrypt(value: string): string {
    return value.startsWith('enc:') ? value.slice(4) : value;
  }
}
