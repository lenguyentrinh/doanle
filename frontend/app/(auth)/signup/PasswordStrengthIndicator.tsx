type Strength = 'empty' | 'weak' | 'medium' | 'strong';

function getStrength(password: string): Strength {
  if (!password) return 'empty';
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isLong = password.length >= 8;
  if (!isLong) return 'weak';
  if (hasUpper && hasNumber && hasSpecial) return 'strong';
  if (hasUpper || hasNumber) return 'medium';
  return 'weak';
}

// Minimal 4-segment hairline meter: filled segments are ink, empty segments
// are hairline. State color appears only on the caption label.
const SEGMENTS: Record<Strength, number> = {
  empty: 0,
  weak: 1,
  medium: 3,
  strong: 4,
};

const LABEL_COLOR: Record<Strength, string> = {
  empty: 'text-ink-muted',
  weak: 'text-error-strong',
  medium: 'text-alert',
  strong: 'text-success',
};

const LABELS: Record<Strength, string> = {
  empty: 'Nhập mật khẩu',
  weak: 'Yếu — thêm ký tự',
  medium: 'Trung bình — thêm số hoặc chữ hoa',
  strong: 'Mạnh',
};

export default function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = getStrength(password);
  const filled = SEGMENTS[strength];

  return (
    <div className="mt-xs">
      <div
        className="flex w-full gap-1"
        role="progressbar"
        aria-label={`Độ mạnh mật khẩu: ${LABELS[strength]}`}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-[2px] flex-1 rounded-full transition-colors duration-200 ${
              i < filled ? 'bg-accent' : 'bg-line'
            }`}
          />
        ))}
      </div>
      <p className={`mt-1 text-caption ${LABEL_COLOR[strength]}`}>{LABELS[strength]}</p>
    </div>
  );
}
