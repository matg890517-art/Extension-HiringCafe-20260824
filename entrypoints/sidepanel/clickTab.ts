export function clickTab(name: string): boolean {
  const drawer = document.querySelector(
    'div[role="dialog"][aria-modal="true"].chakra-modal__content',
  );
  if (!drawer) return false;
  const tabBtn = [...drawer.querySelectorAll('button')].find((b) => {
    const t = (b.textContent ?? '').trim();
    if (/\bapply\b/i.test(t)) return false;
    return new RegExp(name, 'i').test(t);
  });
  tabBtn?.click();
  return Boolean(tabBtn);
}
