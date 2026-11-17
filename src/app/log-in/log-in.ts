import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiLinks } from '../api-links';
import { AuthSession } from '../auth-session';
import { Navbar } from '../navbar/navbar';
import { Benefits } from '../benefits/benefits';
import { Footer } from '../footer/footer';

@Component({
  imports: [FormsModule, RouterLink, Navbar, Benefits, Footer],
  selector: 'app-log-in',
  styleUrl: './log-in.css',
  templateUrl: './log-in.html',
})
export class LogIn {
  private readonly apiLinks = inject(ApiLinks);
  private readonly authSession = inject(AuthSession);
  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal('');
  email = '';
  password = '';

  submitLogin(): void {
    if (this.isSubmitting()) return;

    const email = this.email.trim();
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.apiLinks.authSignIn({ email, password: this.password }).subscribe({
      next: (tokens) => {
        this.isSubmitting.set(false);
        if (!this.authSession.storeTokens(tokens, email)) {
          this.errorMessage.set('Your session could not be saved in this browser. Check storage settings and try again.');
          return;
        }

        void this.router.navigateByUrl('/');
      },
      error: (error: unknown) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.loginError(error));
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  private loginError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Sign in failed. Please try again.';
    }

    if (error.status === 401) {
      return 'The email or password is incorrect.';
    }
    if (error.status === 403) {
      return 'Please verify your email before signing in.';
    }
    if (error.status === 400) {
      return 'Enter a valid email address and password.';
    }
    if (error.status === 0) {
      return 'Could not connect to the sign-in service. Please try again.';
    }

    return 'Sign in failed. Please try again.';
  }
}
