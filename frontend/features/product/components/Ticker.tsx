const MESSAGES = [
  'Hàng mới về mỗi thứ Năm',
  'Đổi trả trong 7 ngày',
  'Kiểm từng chiếc trước khi gửi',
  'Miễn phí giao hàng từ 500.000₫',
];

// 36px clay strip above the header. The message list is duplicated once so
// the marquee loop is seamless at translateX(-50%) — a single pass would
// snap back to start visibly.
export default function Ticker() {
  const items = [...MESSAGES, ...MESSAGES];
  return (
    <div className="flex h-9 items-center overflow-hidden bg-clay text-white">
      <div className="flex animate-marquee gap-[52px] whitespace-nowrap pl-[52px] motion-reduce:animate-none">
        {items.map((text, i) => (
          <span key={i} className="text-label-xs">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
