import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import type { AuthTokensResponse } from './api-links';

const SESSION_STORAGE_KEY = 'gamestation.auth.session';

interface StoredAuthSession extends AuthTokensResponse {
  email: string;
}

function isStoredAuthSession(value: unknown): value is StoredAuthSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    'access_token' in value &&
    typeof value.access_token === 'string' &&
    'refresh_token' in value &&
    typeof value.refresh_token === 'string' &&
    'email' in value &&
    typeof value.email === 'string'
  );
}

@Injectable({ providedIn: 'root' })
export class AuthSession {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly storedSession = this.readStoredSession();

  readonly accessToken = signal(this.storedSession?.access_token ?? null);
  readonly refreshToken = signal(this.storedSession?.refresh_token ?? null);
  readonly email = signal(this.storedSession?.email ?? null);
  readonly isAuthenticated = computed(() => this.accessToken() !== null);

  storeTokens(tokens: AuthTokensResponse, email: string): boolean {
    if (!this.isBrowser || !tokens.access_token || !tokens.refresh_token) return false;

    const storedSession: StoredAuthSession = {
      ...tokens,
      email,
    };

    if (!this.persistSession(storedSession)) return false;

    this.accessToken.set(tokens.access_token);
    this.refreshToken.set(tokens.refresh_token);
    this.email.set(email);
    return true;
  }

  updateAccessToken(accessToken: string): boolean {
    const refreshToken = this.refreshToken();
    const email = this.email();
    if (!this.isBrowser || !accessToken || !refreshToken || !email) return false;

    if (!this.persistSession({ access_token: accessToken, refresh_token: refreshToken, email })) {
      return false;
    }

    this.accessToken.set(accessToken);
    return true;
  }

  clear(): void {
    if (this.isBrowser) sessionStorage.removeItem(SESSION_STORAGE_KEY);
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.email.set(null);
  }

  private persistSession(session: StoredAuthSession): boolean {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      return true;
    } catch (error) {
      if (error instanceof DOMException) return false;
      throw error;
    }
  }

  private readStoredSession(): StoredAuthSession | null {
    if (!this.isBrowser) return null;

    try {
      const serialized = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!serialized) return null;

      const parsed: unknown = JSON.parse(serialized);
      if (isStoredAuthSession(parsed)) return parsed;

      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    } catch (error) {
      if (error instanceof SyntaxError) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      if (error instanceof DOMException) return null;
      throw error;
    }
  }
}
