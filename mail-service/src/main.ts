import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { Logger, type INestMicroservice } from '@nestjs/common';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'mail-service',
          brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        },
        // One consumer group id, appended with "-server" by Nest — every
        // registered @EventPattern/@MessagePattern below ("mail.otp",
        // "mail.order_confirmation", "mail.order_status_update",
        // "mail.health_check") becomes its own Kafka topic this group
        // subscribes to. See mail.controller.ts for the delivery-semantics
        // tradeoff this implies (no per-message nack like RabbitMQ had).
        consumer: { groupId: 'mail-service-consumer' },
        // Disabled so each handler in mail.controller.ts controls commit
        // timing itself (bounded in-place retry, then manual commit) rather
        // than kafkajs auto-committing while a handler is still retrying.
        run: { autoCommit: false },
      },
    },
  );

  await listenWithRetry(app);
}

// ServerKafka.listen() doesn't throw on a failed broker connection — it
// forwards the error through app.listen()'s callback, rejecting the promise.
// Left uncaught, that's an unhandled rejection, which crashes this process
// outright on Node 20 and sends it into a restart(unless-stopped) loop for
// as long as Kafka is down. Retry with backoff instead so this service rides
// out a Kafka outage/restart without the container dying.
async function listenWithRetry(app: INestMicroservice, attempt = 1) {
  try {
    await app.listen();
  } catch (error) {
    const delayMs = Math.min(30000, 1000 * 2 ** (attempt - 1));
    logger.warn(
      `Kafka connection failed (${(error as Error).message}). Retrying in ${delayMs}ms (attempt ${attempt}).`,
    );
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await listenWithRetry(app, attempt + 1);
  }
}

void bootstrap();
