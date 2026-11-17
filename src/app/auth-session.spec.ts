import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiLinks } from './api-links';
import { AuthSession } from './auth-session';
import { authInterceptor } from './auth.interceptor';

const apiOrigin = 'https://api.everrest.educata.dev';

describe('AuthSession and authInterceptor', () => {
  let authSession: AuthSession;
  let http: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ApiLinks,
        AuthSession,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    authSession = TestBed.inject(AuthSession);
    http = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  it('stores the returned tokens and attaches the access token to EverREST requests', () => {
    expect(
      authSession.storeTokens(
        { access_token: 'access-token', refresh_token: 'refresh-token' },
        'player@example.com',
      ),
    ).toBe(true);

    http.get(`${apiOrigin}/shop/cart`).subscribe();

    const request = httpTestingController.expectOne(`${apiOrigin}/shop/cart`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    request.flush({});
    expect(authSession.isAuthenticated()).toBe(true);
    expect(authSession.email()).toBe('player@example.com');
  });

  it('refreshes an expired access token and retries the protected request', () => {
    authSession.storeTokens(
      { access_token: 'expired-token', refresh_token: 'refresh-token' },
      'player@example.com',
    );

    let response: unknown;
    http.get(`${apiOrigin}/shop/cart`).subscribe({
      next: (value) => (response = value),
    });

    const expiredRequest = httpTestingController.expectOne(`${apiOrigin}/shop/cart`);
    expect(expiredRequest.request.headers.get('Authorization')).toBe('Bearer expired-token');
    expiredRequest.flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    const refreshRequest = httpTestingController.expectOne(`${apiOrigin}/auth/refresh`);
    expect(refreshRequest.request.body).toEqual({ refresh_token: 'refresh-token' });
    expect(refreshRequest.request.headers.has('Authorization')).toBe(false);
    refreshRequest.flush({ access_token: 'new-access-token' });

    const retryRequest = httpTestingController.expectOne(`${apiOrigin}/shop/cart`);
    expect(retryRequest.request.headers.get('Authorization')).toBe('Bearer new-access-token');
    retryRequest.flush({ cart: true });

    expect(response).toEqual({ cart: true });
    expect(authSession.accessToken()).toBe('new-access-token');
    expect(JSON.parse(sessionStorage.getItem('gamestation.auth.session') ?? '{}').access_token).toBe(
      'new-access-token',
    );
  });

  it('clears the session when the refresh token is rejected', () => {
    authSession.storeTokens(
      { access_token: 'expired-token', refresh_token: 'rejected-refresh-token' },
      'player@example.com',
    );
    http.get(`${apiOrigin}/shop/cart`).subscribe({ error: () => undefined });

    httpTestingController.expectOne(`${apiOrigin}/shop/cart`).flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );
    httpTestingController.expectOne(`${apiOrigin}/auth/refresh`).flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(authSession.isAuthenticated()).toBe(false);
    expect(authSession.refreshToken()).toBeNull();
  });

  it('does not attach a stored token to the sign-in endpoint', () => {
    authSession.storeTokens(
      { access_token: 'old-token', refresh_token: 'refresh-token' },
      'player@example.com',
    );

    http.post(`${apiOrigin}/auth/sign_in`, {}).subscribe();

    const request = httpTestingController.expectOne(`${apiOrigin}/auth/sign_in`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('does not send EverREST tokens to other origins', () => {
    authSession.storeTokens(
      { access_token: 'access-token', refresh_token: 'refresh-token' },
      'player@example.com',
    );

    http.get('https://example.com/data').subscribe();

    const request = httpTestingController.expectOne('https://example.com/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
