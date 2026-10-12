import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { OrderStatus, type Order } from '../orders/entities/order.entity';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Matches frontend/lib/helpers.ts's formatPrice — orders are priced in VND,
// which has no minor units, so amounts must not be rendered with "$"/toFixed(2).
function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

// Short Vietnamese date for the order confirmation eyebrow, e.g. "7 Th09, 2026".
function formatVnDateShort(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getDate()} Th${month}, ${date.getFullYear()}`;
}

// Mirrors frontend/features/orders/components/OrderStatusBadge.tsx's labels
// so the status word in the email matches what the shopper sees on the site.
const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Chờ xác nhận',
  [OrderStatus.CONFIRMED]: 'Đang chuẩn bị',
  [OrderStatus.SHIPPED]: 'Đang giao',
  [OrderStatus.DELIVERED]: 'Đã giao',
  [OrderStatus.CANCELLED]: 'Đã hủy',
};

// Rotating swatch colors standing in for a product photo on the order
// confirmation line items (design references have no product image in the
// email, per fix/README.md).
const ITEM_SWATCH_COLORS = ['#eddcc2', '#c6bb7d', '#d9c4a3', '#b3a086'];

// Per-status copy for the order status update email. CANCELLED intentionally
// gets no accent-highlighted word in its headline — that state stays visually
// calmer/neutral rather than accented (see fix/README.md).
const STATUS_UPDATE_COPY: Record<
  OrderStatus,
  { headlinePlain: string; headlineAccent: string; supportingCopy: string }
> = {
  [OrderStatus.PENDING]: {
    headlinePlain: 'Đơn hàng của bạn đang',
    headlineAccent: 'chờ xác nhận',
    supportingCopy:
      'Chúng tôi sẽ sớm xác nhận và bắt đầu chuẩn bị đơn hàng cho bạn.',
  },
  [OrderStatus.CONFIRMED]: {
    headlinePlain: 'Đơn hàng của bạn đang',
    headlineAccent: 'được chuẩn bị',
    supportingCopy: 'Đơn hàng đang được đóng gói cẩn thận trước khi giao đi.',
  },
  [OrderStatus.SHIPPED]: {
    headlinePlain: 'Đơn hàng của bạn đang',
    headlineAccent: 'được giao',
    supportingCopy:
      'Đơn hàng đang trên đường đến bạn, dự kiến trong vài ngày tới.',
  },
  [OrderStatus.DELIVERED]: {
    headlinePlain: 'Đơn hàng của bạn đã',
    headlineAccent: 'được giao',
    supportingCopy:
      'Cảm ơn bạn đã mua sắm cùng Oren. Hy vọng bạn hài lòng với sản phẩm.',
  },
  [OrderStatus.CANCELLED]: {
    headlinePlain: 'Đơn hàng của bạn đã bị hủy',
    headlineAccent: '',
    supportingCopy:
      'Khoản hoàn tiền đầy đủ sẽ được xử lý về phương thức thanh toán ban đầu của bạn.',
  },
};

// Shared branded shell for all three transactional emails — a rounded white
// card on a warm cream background with an accent top bar and Oren's type
// pairing, per fix/README.md. `bodyHtml` is the content inside the card's
// 44px/40px padding.
function renderEmailShell(options: {
  title: string;
  preheader: string;
  width: 480 | 560;
  bodyHtml: string;
}): string {
  const { title, preheader, width, bodyHtml } = options;
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(title)}</title>
<!--[if mso]>
<style>table {border-collapse:collapse;} .fallback-font {font-family: Arial, sans-serif;}</style>
<![endif]-->
<style>
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&family=Be+Vietnam+Pro:wght@400;500;700&display=swap');
@media only screen and (max-width:600px) {
  .email-container { width:100% !important; max-width:100% !important; }
  .email-card { padding:32px 24px 28px !important; }
  .email-code { font-size:30px !important; letter-spacing:6px !important; }
  .email-headline-lg { font-size:23px !important; }
  .email-total-amount { font-size:22px !important; }
  .stack-col { display:block !important; width:100% !important; padding-left:0 !important; padding-right:0 !important; }
  .stack-col-gap { padding-top:22px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:#f2e9d8;">
  <span style="display:none;font-size:1px;color:#f2e9d8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2e9d8;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0" class="email-container" style="width:${width}px;max-width:${width}px;">

          <tr>
            <td bgcolor="#c05f3c" style="height:8px;line-height:8px;font-size:1px;border-radius:20px 20px 0 0;">&nbsp;</td>
          </tr>

          <tr>
            <td bgcolor="#fffdf9" class="email-card" style="border-radius:0 0 20px 20px;box-shadow:0 24px 48px -24px rgba(63,49,40,0.22);padding:44px 44px 40px;">
${bodyHtml}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:32px 20px 0;font-family:'Newsreader',Georgia,serif;font-size:13px;color:#b3a086;">Oren — thiết kế trầm lặng, làm theo lô nhỏ.</td>
          </tr>
          <tr>
            <td align="center" style="padding:10px 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.8;color:#c3ae97;">
              12 Trần Hưng Đạo, Quận 1, TP.HCM
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Solid dark pill CTA shared by the confirmation and status-update emails.
function renderTrackOrderButton(trackUrl: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td bgcolor="#3f3128" style="border-radius:999px;">
                        <a href="${trackUrl}" style="display:block;padding:16px 42px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Theo dõi đơn hàng</a>
                      </td>
                    </tr>
                  </table>`;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private smtpConfigured = false;
  private readonly mailFrom: string;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT') || 587,
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
    this.mailFrom =
      this.configService.get<string>('MAIL_FROM') ||
      this.configService.get<string>('SMTP_USER') ||
      '';
  }

  onModuleInit() {
    const requiredVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
    const missing = requiredVars.filter(
      (v) => !this.configService.get<string>(v),
    );

    if (missing.length > 0) {
      const msg = `SMTP misconfigured: missing ${missing.join(', ')}`;
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        this.logger.error(msg);
        throw new Error(msg);
      }
      this.logger.warn(msg + ' — email features disabled');
      return;
    }

    this.smtpConfigured = true;
    this.logger.log('SMTP configured successfully');
  }

  async checkSmtpHealth(): Promise<{
    status: 'ok' | 'misconfigured';
    message: string;
  }> {
    if (!this.smtpConfigured) {
      return {
        status: 'misconfigured',
        message:
          'SMTP not configured — check SMTP_HOST, SMTP_USER, SMTP_PASSWORD',
      };
    }

    try {
      await this.transporter.verify();
      return { status: 'ok', message: 'SMTP connection successful' };
    } catch (error) {
      return {
        status: 'misconfigured',
        message: `SMTP connection failed: ${(error as Error).message}`,
      };
    }
  }

  async sendOtpEmail(to: string, code: string, expiresAtDate: Date) {
    const expiresAt = expiresAtDate.toISOString();
    const bodyHtml = `              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-family:'Newsreader',Georgia,serif;font-size:26px;line-height:1.3;color:#3f3128;padding-bottom:10px;">Mã xác thực email</td>
                </tr>
                <tr>
                  <td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:13.5px;line-height:1.7;color:#7d6553;padding-bottom:32px;">Dùng mã dưới đây để xác thực địa chỉ email của bạn.</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#faf5ee" style="border-radius:14px;">
                <tr>
                  <td align="center" class="email-code" style="padding:28px 20px;font-family:'Newsreader',Georgia,serif;font-size:40px;letter-spacing:10px;color:#3f3128;">${escapeHtml(code)}</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:22px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#a5907a;">Mã sẽ hết hạn sau 5 phút, lúc ${escapeHtml(expiresAt)}</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #ecdfc7;margin-top:32px;">
                <tr>
                  <td style="padding-top:22px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.7;color:#a5907a;">Nếu bạn không yêu cầu mã này, bạn có thể bỏ qua email này.</td>
                </tr>
              </table>
`;

    await this.transporter.sendMail({
      from: this.mailFrom,
      to,
      subject: 'Mã xác thực email',
      text: `Mã xác thực email của bạn là ${code}. Mã sẽ hết hạn sau 5 phút.`,
      html: renderEmailShell({
        title: 'Mã xác thực email',
        preheader: 'Mã xác thực email của bạn — hết hạn sau 5 phút.',
        width: 480,
        bodyHtml,
      }),
    });
  }

  async sendOrderConfirmation(order: Order, toEmail: string): Promise<void> {
    const payload = {
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
    const from = this.mailFrom;
    const trackUrl = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:8000'}/orders/${payload.orderId}`;
    const address = payload.shippingAddress;

    const itemsText = payload.items
      .map(
        (item) =>
          `  - ${item.productName} x${item.quantity} — ${formatVnd(item.price * item.quantity)}`,
      )
      .join('\n');

    const itemsHtml = payload.items
      .map((item, index) => {
        const isLast = index === payload.items.length - 1;
        const rowPadding = isLast ? '' : 'padding-bottom:22px;';
        const swatch = ITEM_SWATCH_COLORS[index % ITEM_SWATCH_COLORS.length];
        return `                      <tr>
                        <td width="64" valign="top" style="${rowPadding}">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="64" height="80" bgcolor="${swatch}" style="border-radius:10px;font-size:1px;line-height:80px;">&nbsp;</td></tr></table>
                        </td>
                        <td width="16" style="font-size:1px;">&nbsp;</td>
                        <td valign="top" style="${rowPadding}font-family:'Newsreader',Georgia,serif;font-size:16px;color:#3f3128;">
                          ${escapeHtml(item.productName)}
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a5907a;padding-top:5px;">Số lượng ${item.quantity}</div>
                        </td>
                        <td valign="top" align="right" style="${rowPadding}font-family:'Newsreader',Georgia,serif;font-size:16px;color:#3f3128;white-space:nowrap;">${formatVnd(item.price * item.quantity)}</td>
                      </tr>`;
      })
      .join('\n');

    const eyebrow = `Đơn #${payload.orderId} &nbsp;·&nbsp; ${formatVnDateShort(new Date())}`;

    const bodyHtml = `              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" class="email-headline-lg" style="font-family:'Newsreader',Georgia,serif;font-weight:bold;font-size:29px;line-height:1.3;color:#3f3128;padding-bottom:12px;">
                    Đơn hàng của bạn<br>đã được <span style="color:#c05f3c;">xác nhận</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a5907a;padding-bottom:32px;">${eyebrow}</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #ecdfc7;border-bottom:1px solid #ecdfc7;">
                <tr>
                  <td style="padding:26px 0 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${itemsHtml}
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:22px 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#a5907a;">Tạm tính</td>
                  <td align="right" style="padding:22px 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#a5907a;">${formatVnd(payload.subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#a5907a;">Vận chuyển</td>
                  <td align="right" style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#a5907a;">${formatVnd(payload.shippingFee)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#a5907a;">VAT</td>
                  <td align="right" style="padding:4px 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#a5907a;">${formatVnd(payload.tax)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="border-top:1px dashed #e0d0ba;font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:18px 0 34px;font-family:'Newsreader',Georgia,serif;font-weight:bold;font-size:15px;color:#3f3128;white-space:nowrap;">Tổng cộng</td>
                  <td align="right" class="email-total-amount" style="padding:18px 0 34px;font-family:'Newsreader',Georgia,serif;font-weight:bold;font-size:27px;color:#c05f3c;white-space:nowrap;">${formatVnd(payload.total)}</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    ${renderTrackOrderButton(trackUrl)}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a5907a;">Dự kiến giao hàng trong 3&ndash;5 ngày làm việc</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #ecdfc7;margin-top:34px;">
                <tr>
                  <td width="50%" valign="top" class="stack-col" style="padding:26px 12px 0 0;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#a5907a;padding-bottom:9px;">Giao đến</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#3f3128;">
                      ${escapeHtml(address.firstName)} ${escapeHtml(address.lastName)}<br>${escapeHtml(address.street)}<br>${escapeHtml(address.city)}
                    </div>
                  </td>
                  <td width="50%" valign="top" class="stack-col stack-col-gap" style="padding:26px 0 0 12px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#a5907a;padding-bottom:9px;">Cần hỗ trợ?</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#7d6553;">
                      Viết cho chúng tôi bất cứ lúc nào —<br>
                      <a href="mailto:hello@oren.store" style="color:#c05f3c;text-decoration:none;">hello@oren.store</a>
                    </div>
                  </td>
                </tr>
              </table>
`;

    await this.transporter.sendMail({
      from,
      to: payload.toEmail,
      subject: `Đơn hàng #${payload.orderId} của bạn đã được xác nhận`,
      text: `Oren

Đơn hàng #${payload.orderId} đã được xác nhận. Cảm ơn bạn đã mua sắm cùng chúng tôi!

Sản phẩm:
${itemsText}

Tạm tính: ${formatVnd(payload.subtotal)}
Phí vận chuyển: ${formatVnd(payload.shippingFee)}
Thuế: ${formatVnd(payload.tax)}
Tổng cộng: ${formatVnd(payload.total)}

Giao đến:
${address.firstName} ${address.lastName}
${address.street}
${address.city}

Dự kiến giao hàng: 3–5 ngày làm việc

Theo dõi đơn hàng: ${trackUrl}`,
      html: renderEmailShell({
        title: `Đơn hàng #${payload.orderId} đã được xác nhận`,
        preheader: `Đơn hàng #${payload.orderId} đã được xác nhận — cảm ơn bạn đã mua sắm cùng Oren.`,
        width: 560,
        bodyHtml,
      }),
    });
  }

  async sendOrderStatusUpdate(order: Order, toEmail: string): Promise<void> {
    const payload = {
      orderId: order.id,
      toEmail,
      status: order.status,
    };
    const from = this.mailFrom;
    const trackUrl = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:8000'}/orders/${payload.orderId}`;
    const isCancelled = payload.status === OrderStatus.CANCELLED;
    const copy = STATUS_UPDATE_COPY[payload.status];
    const statusLabel = STATUS_LABELS[payload.status];

    const subject = isCancelled
      ? `Đơn hàng #${payload.orderId} của bạn đã bị hủy`
      : `Cập nhật đơn hàng #${payload.orderId}`;

    const bodyText = isCancelled
      ? `Đơn hàng #${payload.orderId} của bạn đã bị hủy. Khoản hoàn tiền đầy đủ sẽ được xử lý về phương thức thanh toán ban đầu của bạn.`
      : `Trạng thái đơn hàng #${payload.orderId} của bạn hiện là: ${statusLabel}.`;

    const headlineHtml = copy.headlineAccent
      ? `${copy.headlinePlain} <span style="color:#c05f3c;">${copy.headlineAccent}</span>`
      : copy.headlinePlain;

    // Cancelled stays visually calmer/neutral rather than accented, per fix/README.md.
    const chipColor = isCancelled ? '#7d6553' : '#c05f3c';

    const bodyHtml = `              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a5907a;padding-bottom:14px;">Đơn #${payload.orderId}</td>
                </tr>
                <tr>
                  <td align="center" style="font-family:'Newsreader',Georgia,serif;font-size:27px;line-height:1.3;color:#3f3128;padding-bottom:20px;">
                    ${headlineHtml}
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#faf5ee" style="border-radius:999px;">
                <tr>
                  <td align="center" style="padding:12px 20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${chipColor};">${escapeHtml(statusLabel)}</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;line-height:1.7;color:#7d6553;">${copy.supportingCopy}</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-top:32px;">
                    ${renderTrackOrderButton(trackUrl)}
                  </td>
                </tr>
              </table>
`;

    await this.transporter.sendMail({
      from,
      to: payload.toEmail,
      subject,
      text: `Oren

${bodyText}

Theo dõi đơn hàng: ${trackUrl}`,
      html: renderEmailShell({
        title: subject,
        preheader: `Trạng thái đơn hàng #${payload.orderId} của bạn hiện là: ${statusLabel}.`,
        width: 480,
        bodyHtml,
      }),
    });
  }
}
