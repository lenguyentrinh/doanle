import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());
  app.use(cookieParser());

  // Trust exactly this many reverse-proxy hops so ThrottlerGuard and other
  // IP-based features read the real client IP from X-Forwarded-For instead
  // of the proxy's. This MUST match the actual deployment topology — set
  // TRUST_PROXY_HOPS (see .env.example) rather than editing this default.
  // Trusting more hops than actually exist (or trusting any hop count while
  // the backend is still reachable directly, bypassing the proxy) lets a
  // client forge X-Forwarded-For and spoof its IP, defeating IP-based rate
  // limiting; the deploy topology must ensure the backend port is only
  // reachable through that trusted proxy.
  const parsedTrustProxyHops = Number(process.env.TRUST_PROXY_HOPS);
  const trustProxyHops = Number.isFinite(parsedTrustProxyHops)
    ? parsedTrustProxyHops
    : 1;
  app.set('trust proxy', trustProxyHops);

  // Enable CORS
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || 'http://localhost:8000'
        : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global /api prefix with exclusions for backward compatibility
  app.setGlobalPrefix('api', { exclude: ['health'] });

  // Swagger publishes the full API schema (routes, DTOs, auth scheme) at
  // /api — enabled by default outside production, but production must opt in
  // explicitly via ENABLE_SWAGGER rather than exposing it by default.
  const swaggerEnabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Ecommerce API')
      .setDescription('API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
