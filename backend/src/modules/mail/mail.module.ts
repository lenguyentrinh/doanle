import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MailService } from './mail.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'MAIL_SERVICE',
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'ecommerce-backend',
              brokers: (
                config.get<string>('KAFKA_BROKERS') || 'localhost:9092'
              ).split(','),
            },
            // Consumer group for the reply topics ClientKafka subscribes to
            // when MailService.checkSmtpHealth() calls send() — see
            // mail.service.ts's onModuleInit (subscribeToResponseOf).
            consumer: { groupId: 'mail-client-consumer' },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
