import type { Anchor, DockMode, Position, Size } from './types';

export type PersistedContextState = {
  anchor?: Anchor;
  anchorOffset?: Position;
  size?: Size;
  hasCustomPosition?: boolean;
};

export type PersistedState = {
  button?: Omit<PersistedContextState, 'size'>;
  window?: PersistedContextState;
  isOpen?: boolean;
  dockMode?: DockMode;
};

export function loadInspectorState(cookieName: string): PersistedState | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${cookieName}=`;
  const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix));
  if (!entry) {
    return null;
  }

  const raw = entry.substring(prefix.length);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (parsed && typeof parsed === 'object') {
      return parsed as PersistedState;
    }
  } catch (error) {
    return null;
  }

  return null;
}

export function saveInspectorState(
  cookieName: string,
  state: PersistedState,
  maxAgeSeconds: number,
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const encoded = encodeURIComponent(JSON.stringify(state));
  document.cookie = `${cookieName}=${encoded}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function isValidAnchor(value: unknown): value is Anchor {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Anchor;
  return (
    (candidate.horizontal === 'left' || candidate.horizontal === 'right') &&
    (candidate.vertical === 'top' || candidate.vertical === 'bottom')
  );
}

export function isValidPosition(value: unknown): value is Position {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Position;
  return isFiniteNumber(candidate.x) && isFiniteNumber(candidate.y);
}

export function isValidSize(value: unknown): value is Size {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Size;
  return isFiniteNumber(candidate.width) && isFiniteNumber(candidate.height);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isValidDockMode(value: unknown): value is DockMode {
  return value === 'floating' || value === 'docked-left' || value === 'docked-bottom';
}
