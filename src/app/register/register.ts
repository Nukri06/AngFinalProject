import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiLinks } from '../api-links';
import type { AuthGender, AuthSignUpRequest } from '../api-links';
import { Footer } from '../footer/footer';
import { Navbar } from '../navbar/navbar';
import { Benefits } from '../benefits/benefits';

type RegistrationFormValue = Omit<AuthSignUpRequest, 'age' | 'gender'> & {
  age: number | null;
  gender: AuthGender | '';
};

@Component({
  imports: [FormsModule, RouterLink, Navbar, Footer, Benefits],
  selector: 'app-register',
  styleUrl: './register.css',
  templateUrl: './register.html',
})
export class Register {
  private readonly apiLinks = inject(ApiLinks);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  confirmPassword = '';
  readonly registration: RegistrationFormValue = {
    firstName: '',
    lastName: '',
    age: null,
    email: '',
    password: '',
    address: '',
    phone: '',
    zipcode: '',
    avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=GameStation',
    gender: '',
  };
  readonly genderOptions: { value: AuthGender; label: string }[] = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' },
  ];

  submitRegistration(): void {
    if (this.isSubmitting()) return;

    if (this.registration.password !== this.confirmPassword) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    const { age, gender, ...details } = this.registration;
    if (age === null || age < 1 || !gender) {
      this.errorMessage.set('Enter a valid age and choose a gender.');
      return;
    }

    const request: AuthSignUpRequest = { ...details, age, gender };
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.apiLinks.authSignUp(request).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        if ('deleted' in response && response.deleted > 0) {
          this.errorMessage.set(response.message);
          return;
        }

        this.successMessage.set(
          'Your account was created. Check your email to verify it, then sign in.',
        );
      },
      error: (error: unknown) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.registrationError(error));
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((visible) => !visible);
  }

  private registrationError(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Registration failed. Please try again.';
    }

    if (error.status === 409) {
      return 'An account with this email already exists.';
    }
    if (error.status === 400) {
      return 'Check your details and make sure the password is 8 to 30 characters.';
    }
    if (error.status === 0) {
      return 'Could not connect to the registration service. Please try again.';
    }

    return 'Registration failed. Please try again.';
  }
}
