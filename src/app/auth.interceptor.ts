import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, map, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { ApiLinks } from './api-links';
import { AuthSession } from './auth-session';

const EVERREST_API_ORIGIN = 'https://api.everrest.educata.dev';
const PUBLIC_AUTH_PATHS = [
  '/auth/sign_up',
  '/auth/sign_in',
  '/auth/refresh',
  '/auth/verify_email',
  '/auth/recovery',
];

let refreshInProgress: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(`${EVERREST_API_ORIGIN}/`)) return next(request);
  if (PUBLIC_AUTH_PATHS.some((path) => request.url === `${EVERREST_API_ORIGIN}${path}`)) {
    return next(request);
  }

  const authSession = inject(AuthSession);
  const apiLinks = inject(ApiLinks);
  const token = authSession.accessToken();
  const authorizedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      const currentToken = authSession.accessToken();
      if (token && currentToken && currentToken !== token) {
        return next(request.clone({ setHeaders: { Authorization: `Bearer ${currentToken}` } }));
      }

      const refreshToken = authSession.refreshToken();
      if (!refreshToken) {
        authSession.clear();
        return throwError(() => error);
      }

      return refreshAccessToken(apiLinks, authSession, refreshToken).pipe(
        switchMap((newToken) =>
          next(request.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })),
        ),
      );
    }),
  );
};

function refreshAccessToken(
  apiLinks: ApiLinks,
  authSession: AuthSession,
  refreshToken: string,
): Observable<string> {
  if (!refreshInProgress) {
    refreshInProgress = apiLinks.authRefresh(refreshToken).pipe(
      map((response) => {
        if (!authSession.updateAccessToken(response.access_token)) {
          throw new Error('The refreshed session could not be saved.');
        }
        return response.access_token;
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          authSession.clear();
        }
        return throwError(() => error);
      }),
      finalize(() => {
        refreshInProgress = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  return refreshInProgress;
}
