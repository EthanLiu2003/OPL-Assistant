// Injects a name-search query into OPL's client-side #searchfield after
// page hydration. Works on both /rankings/* and /records/* paths.

const titleCase = (s: string): string =>
  s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

const setNativeValue = (el: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
};

const dispatchKeySequence = (el: HTMLElement, key: string) => {
  for (const type of ['keydown', 'keypress', 'keyup'] as const) {
    el.dispatchEvent(
      new KeyboardEvent(type, { key, bubbles: true, cancelable: true }),
    );
  }
};

const tryInject = (name: string): boolean => {
  const field = document.getElementById('searchfield') as HTMLInputElement | null;
  if (!field) return false;

  setNativeValue(field, name);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  dispatchKeySequence(field, name.slice(-1) || 'a');
  field.focus();

  const button = document.getElementById('searchbutton') as HTMLButtonElement | null;
  if (button) {
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    button.click();
  } else {
    dispatchKeySequence(field, 'Enter');
  }
  return true;
};

const stripQueryParam = () => {
  const clean = new URL(location.href);
  clean.searchParams.delete('q');
  history.replaceState({}, '', clean.toString());
};

export function applyNameSearchFromUrl() {
  const isRankingsOrRecords =
    location.pathname.startsWith('/rankings') ||
    location.pathname.startsWith('/records');
  if (!isRankingsOrRecords) return;

  const q = new URL(location.href).searchParams.get('q');
  if (!q) return;

  const name = titleCase(q);

  if (tryInject(name)) {
    stripQueryParam();
    return;
  }

  let attempts = 0;
  const id = window.setInterval(() => {
    attempts += 1;
    if (tryInject(name)) {
      stripQueryParam();
      clearInterval(id);
    } else if (attempts > 40) {
      clearInterval(id);
    }
  }, 100);
}
