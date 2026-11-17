import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiLinks } from '../api-links';
import { AuthSession } from '../auth-session';
import { LogIn } from './log-in';

describe('LogIn', () => {
  const tokens = { access_token: 'access-token', refresh_token: 'refresh-token' };
  const signIn = vi.fn();
  const navigateByUrl = vi.fn();
  let component: LogIn;
  let authSession: AuthSession;

  beforeEach(() => {
    sessionStorage.clear();
    signIn.mockReset();
    signIn.mockReturnValue(of(tokens));
    navigateByUrl.mockReset();

    TestBed.configureTestingModule({
      providers: [
        AuthSession,
        { provide: ApiLinks, useValue: { authSignIn: signIn } },
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });
    authSession = TestBed.inject(AuthSession);
    component = TestBed.runInInjectionContext(() => new LogIn());
  });

  afterEach(() => sessionStorage.clear());

  it('stores the returned tokens and navigates home after successful sign-in', () => {
    component.email = ' player@example.com ';
    component.password = 'password123';

    component.submitLogin();

    expect(signIn).toHaveBeenCalledWith({
      email: 'player@example.com',
      password: 'password123',
    });
    expect(authSession.accessToken()).toBe(tokens.access_token);
    expect(authSession.isAuthenticated()).toBe(true);
    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows a useful message when credentials are rejected', () => {
    signIn.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );

    component.submitLogin();

    expect(component.errorMessage()).toBe('The email or password is incorrect.');
    expect(authSession.isAuthenticated()).toBe(false);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});
