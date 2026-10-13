// Lets code-driven navigations (router.push after login, checkout, search…)
// raise the same full-page loader that <NavigationLoader /> shows for link
// clicks. NavigationLoader listens for this event; it hides itself once the
// URL actually changes.
export const NAVIGATION_START_EVENT = 'oren:navigation-start';

export function startNavigationLoader(href?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NAVIGATION_START_EVENT, { detail: { href } }));
}

type RouterLike = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

export function pushWithLoader(router: RouterLike, href: string) {
  startNavigationLoader(href);
  router.push(href);
}

export function replaceWithLoader(router: RouterLike, href: string) {
  startNavigationLoader(href);
  router.replace(href);
}
