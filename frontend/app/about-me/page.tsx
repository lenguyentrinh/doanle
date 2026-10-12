import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Về Oren',
  description: 'Oren — ít hơn, nhưng kỹ hơn. Lô nhỏ, truy xuất được, sửa chữa trọn đời.',
};

const VALUES = [
  {
    num: 'i',
    title: 'Lô nhỏ',
    body: 'Mỗi thiết kế chỉ làm 50 chiếc. Không tồn kho khổng lồ, không xả hàng cuối mùa, không đốt vải thừa.',
  },
  {
    num: 'ii',
    title: 'Truy xuất được',
    body: 'Len, lụa và linen đều có nguồn ghi rõ trên nhãn. Bạn biết chiếc áo mình mặc đến từ đâu.',
  },
  {
    num: 'iii',
    title: 'Sửa, không bỏ',
    body: 'Đường may bung, khuy rơi — gửi lại cho chúng tôi. Sửa miễn phí trọn đời sản phẩm.',
  },
];

export default function AboutMePage() {
  return (
    <div className="motion-safe:animate-fade-up">
      <section className="mx-auto max-w-[1000px] px-5 py-24 text-center lg:px-10">
        <span className="text-label-xs text-accent">Về Oren</span>
        <h1 className="mt-3 text-display-lg text-ink">
          Ít hơn, nhưng <em className="text-accent">kỹ hơn</em>
        </h1>
        <p className="mx-auto mt-6 max-w-[56ch] text-body-lg text-ink-secondary">
          Oren bắt đầu từ một câu hỏi đơn giản: tại sao phải mua mười chiếc áo trong một
          năm, khi ba chiếc được làm đúng có thể theo bạn cả thập kỷ?
        </p>
      </section>

      <section className="mx-auto max-w-[1480px] px-5 lg:px-10">
        <div className="relative aspect-[16/7] min-h-[240px] overflow-hidden rounded-[16px] bg-fill-dark">
          <Image src="/images/home.png" alt="" fill sizes="100vw" className="object-cover object-[center_30%]" />
        </div>
      </section>

      <section className="mx-auto px-5 py-24 lg:px-10">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.num} className="flex flex-col gap-3">
              <span className="font-display italic text-accent">{v.num}</span>
              <h2 className="text-headline-sm text-ink">{v.title}</h2>
              <p className="text-body-sm leading-relaxed text-ink-secondary">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1000px] px-5 pb-24 lg:px-10">
        <div className="flex flex-col items-center gap-6 rounded-[18px] bg-fill px-8 py-16 text-center">
          <h2 className="text-display-md text-ink">
            Bắt đầu với một món bạn sẽ mặc trăm lần
          </h2>
          <Link
            href="/products"
            className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-ink px-8 py-4 text-label-sm text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Xem bộ sưu tập
          </Link>
        </div>
      </section>
    </div>
  );
}
