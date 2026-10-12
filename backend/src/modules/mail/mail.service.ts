import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { catchError, lastValueFrom, of, timeout } from 'rxjs';
import { type Order } from '../orders/entities/order.entity';
import type {
  OrderConfirmationPayload,
  OrderStatusUpdatePayload,
} from './mail.types';

// Thin adapter: mail sending itself now lives in mail-service (see
// mail-service/src/mail/mail.service.ts), reached over Kafka. This keeps
// the public API identical to the pre-extraction MailService so
// auth.service.ts / orders.service.ts / orders-admin.service.ts /
// health.controller.ts don't need to change at all.
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly healthCheckTimeoutMs: number;
  private isConnected = false;

  constructor(
    @Inject('MAIL_SERVICE') private readonly client: ClientKafka,
    private readonly configService: ConfigService,
  ) {
    this.healthCheckTimeoutMs =
      Number(this.configService.get<string>('MAIL_HEALTH_CHECK_TIMEOUT_MS')) ||
      5000;
  }

  async onModuleInit() {
    await this.tryConnect();
  }

  // Retried from checkSmtpHealth (not just onModuleInit) so a Kafka outage
  // at boot doesn't leave health reporting "unreachable" forever once
  // Kafka actually comes back up.
  private async tryConnect() {
    try {
      // ClientKafka's send() (used by checkSmtpHealth below) is request/reply:
      // it needs to be subscribed to the "mail.health_check.reply" topic
      // *before* connecting, or replies from mail-service never reach it.
      this.client.subscribeToResponseOf('mail.health_check');
      await this.client.connect();
      // connect() resolves once the consumer joins the group, but partition
      // assignment (needed by send() to address the reply) lands slightly
      // later via a GROUP_JOIN event. Without this, a checkSmtpHealth() call
      // right after boot can throw InvalidKafkaClientTopicException instead
      // of actually reaching mail-service.
      await this.waitForReplyTopicAssignment('mail.health_check.reply');
      this.isConnected = true;
    } catch (error) {
      this.logger.warn(
        `Kafka connection for MailService skipped/failed (${(error as Error).message}). Email notifications will be disabled until Kafka is available.`,
      );
    }
  }

  private async waitForReplyTopicAssignment(topic: string) {
    const deadline = Date.now() + this.healthCheckTimeoutMs;
    while (
      this.client.getConsumerAssignments()[topic] === undefined &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  // Errors intentionally propagate — auth.service.ts / orders.service.ts /
  // orders-admin.service.ts each catch these to log with their own context
  // (order id, etc.) and, for OTP, to surface a ServiceUnavailableException.
  async sendOtpEmail(to: string, code: string, expiresAt: Date) {
    await lastValueFrom(
      this.client.emit('mail.otp', {
        to,
        code,
        expiresAt: expiresAt.toISOString(),
      }),
    );
  }

  async sendOrderConfirmation(order: Order, toEmail: string): Promise<void> {
    const payload: OrderConfirmationPayload = {
      orderId: order.id,
      toEmail,
      items: order.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
      })),
      shippingAddress: order.shippingAddress,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      tax: order.tax,
      total: order.total,
    };
    await lastValueFrom(this.client.emit('mail.order_confirmation', payload));
  }

  async sendOrderStatusUpdate(order: Order, toEmail: string): Promise<void> {
    const payload: OrderStatusUpdatePayload = {
      orderId: order.id,
      toEmail,
      status: order.status,
    };
    await lastValueFrom(this.client.emit('mail.order_status_update', payload));
  }

  async checkSmtpHealth(): Promise<{
    status: 'ok' | 'misconfigured' | 'unreachable';
    message: string;
  }> {
    if (!this.isConnected) {
      await this.tryConnect();
    }
    if (!this.isConnected) {
      return {
        status: 'unreachable',
        message: 'Kafka client not connected',
      };
    }
    return lastValueFrom(
      this.client
        .send<{
          status: 'ok' | 'misconfigured';
          message: string;
        }>('mail.health_check', {})
        .pipe(
          timeout(this.healthCheckTimeoutMs),
          catchError((error: Error) =>
            of({
              status: 'unreachable' as const,
              message: `mail-service unreachable: ${error.message}`,
            }),
          ),
        ),
    );
  }
}
