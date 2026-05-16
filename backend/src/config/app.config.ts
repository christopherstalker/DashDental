import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: process.env.APP_PORT ? Number(process.env.APP_PORT) : 4000,
  url: process.env.APP_URL ?? 'http://localhost:4000',
}));
