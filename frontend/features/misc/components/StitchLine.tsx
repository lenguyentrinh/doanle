const COUNT = 21;
const BREAK = 10;

const stitches = Array.from({ length: COUNT }, (_, i) => {
  const isBreak = i === BREAK;
  const after = i > BREAK;
  return {
    width: isBreak ? 9 : 14,
    height: isBreak ? 9 : after ? 2 : 3,
    color: isBreak ? 'bg-error-strong' : after ? 'bg-line-strong' : 'bg-accent',
    delay: i * 45 + 120,
  };
});

// Error boundary's motif in place of a generic warning icon: a stitched seam
// that runs in from the left and snaps at the middle, then resumes thinner —
// "the thread broke". Purely decorative, no state.
export default function StitchLine() {
  return (
    <div aria-hidden className="flex w-full max-w-[520px] items-center justify-center gap-[5px] overflow-hidden py-1">
      {stitches.map((s, i) => (
        <span
          key={i}
          className={`block origin-center rounded-full motion-safe:animate-stitch-in motion-reduce:animate-none ${s.color}`}
          style={{ width: s.width, height: s.height, animationDelay: `${s.delay}ms` }}
        />
      ))}
    </div>
  );
}
