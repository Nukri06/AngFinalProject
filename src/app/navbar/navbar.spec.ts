import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthSession } from '../auth-session';
import { Navbar } from './navbar';

describe('Navbar', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter([])],
    });
  });

  afterEach(() => sessionStorage.clear());

  it('clears the signed-in session and shows sign-in actions after logout', () => {
    const authSession = TestBed.inject(AuthSession);
    authSession.storeTokens(
      { access_token: 'access-token', refresh_token: 'refresh-token' },
      'player@example.com',
    );
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.logout-button')).not.toBeNull();

    const logoutButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.logout-button');
    logoutButton?.click();
    fixture.detectChanges();

    expect(authSession.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('gamestation.auth.session')).toBeNull();
    expect(fixture.nativeElement.querySelector('.logout-button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.auth-links')).not.toBeNull();
  });
});
