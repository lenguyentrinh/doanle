import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  KafkaContext,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';
import { MailService } from './mail.service';
import { retryWithBackoff } from '../common/retry-with-backoff';
import type {
  OtpEmailPayload,
  OrderConfirmationPayload,
  OrderStatusUpdatePayload,
} from './mail.types';

// Manual offset commit (see main.ts's `run: { autoCommit: false }`): each
// handler retries the send a bounded number of times in place (the
// underlying topics have a single partition, so an unbounded retry here
// would stall every message behind it), then commits the offset itself
// regardless of outcome — a final failure is logged and dropped rather than
// replayed forever or dead-lettered (same accepted best-effort tradeoff as
// before, now explicit via manual commit instead of relying on kafkajs's
// auto-commit to paper over it).
@Controller()
export class MailController {
  private readonly logger = new Logger(MailController.name);

  constructor(private readonly mailService: MailService) {}

  @EventPattern('mail.otp')
  async handleOtp(
    @Payload() payload: OtpEmailPayload,
    @Ctx() context: KafkaContext,
  ) {
    const heartbeat = context.getHeartbeat();
    try {
      await retryWithBackoff(
        () =>
          this.mailService.sendOtpEmail(
            payload.to,
            payload.code,
            payload.expiresAt,
          ),
        { onRetry: () => heartbeat() },
      );
    } catch (err) {
      this.logger.error(
        `mail.otp failed for ${payload.to}`,
        err instanceof Error ? err.stack : String(err),
      );
    } finally {
      await this.commit(context);
    }
  }

  @EventPattern('mail.order_confirmation')
  async handleOrderConfirmation(
    @Payload() payload: OrderConfirmationPayload,
    @Ctx() context: KafkaContext,
  ) {
    const heartbeat = context.getHeartbeat();
    try {
      await retryWithBackoff(
        () => this.mailService.sendOrderConfirmation(payload),
        { onRetry: () => heartbeat() },
      );
    } catch (err) {
      this.logger.error(
        `mail.order_confirmation failed for order ${payload.orderId}`,
        err instanceof Error ? err.stack : String(err),
      );
    } finally {
      await this.commit(context);
    }
  }

  @EventPattern('mail.order_status_update')
  async handleOrderStatusUpdate(
    @Payload() payload: OrderStatusUpdatePayload,
    @Ctx() context: KafkaContext,
  ) {
    const heartbeat = context.getHeartbeat();
    try {
      await retryWithBackoff(
        () => this.mailService.sendOrderStatusUpdate(payload),
        { onRetry: () => heartbeat() },
      );
    } catch (err) {
      this.logger.error(
        `mail.order_status_update failed for order ${payload.orderId}`,
        err instanceof Error ? err.stack : String(err),
      );
    } finally {
      await this.commit(context);
    }
  }

  @MessagePattern('mail.health_check')
  async handleHealthCheck() {
    return this.mailService.checkSmtpHealth();
  }

  private async commit(context: KafkaContext): Promise<void> {
    const message = context.getMessage();
    await context.getConsumer().commitOffsets([
      {
        topic: context.getTopic(),
        partition: context.getPartition(),
        offset: String(Number(message.offset) + 1),
      },
    ]);
  }
}
