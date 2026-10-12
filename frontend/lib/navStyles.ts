export const navLink =
  'w-fit border-l pl-4 text-body-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink focus-visible:ring-offset-2';

export const railLink = (active: boolean) =>
  `${navLink} ${active ? 'border-ink text-ink' : 'border-transparent text-ink-secondary hover:text-ink'}`;
