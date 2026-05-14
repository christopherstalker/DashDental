import {
  MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { RequestObservabilityMiddleware } from './request-observability.middleware';

@Module({})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestObservabilityMiddleware).forRoutes('{*path}');
  }
}
