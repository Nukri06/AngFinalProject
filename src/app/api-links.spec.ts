import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ApiLinks,
  AuthSignUpRequest,
  CartResponse,
  isEmailVerificationRequiredError,
} from './api-links';

const cartUrl = 'https://api.everrest.educata.dev/shop/cart';
const productUrl = `${cartUrl}/product`;
const authUrl = 'https://api.everrest.educata.dev/auth';
const cartResponse: CartResponse = {
  _id: 'cart-id',
  userId: 'user-id',
  createdAt: '2026-01-01T00:00:00.000Z',
  total: {
    price: { current: 0, beforeDiscount: 0 },
    quantity: 0,
    products: 0,
  },
  products: [],
};
const signUpRequest: AuthSignUpRequest = {
  firstName: 'Alex',
  lastName: 'Player',
  age: 24,
  email: 'alex@example.com',
  password: 'secure-password',
  address: '1 Game Street',
  phone: '5551234567',
  zipcode: '10001',
  avatar: 'https://example.com/avatar.png',
  gender: 'OTHER',
};

describe('ApiLinks methods', () => {
  let apiLinks: ApiLinks;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiLinks, provideHttpClient(), provideHttpClientTesting()],
    });
    apiLinks = TestBed.inject(ApiLinks);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('recognizes the API email-verification conflict', () => {
    const error = new HttpErrorResponse({
      status: 409,
      statusText: 'Conflict',
      error: { errorKeys: ['errors.user_email_not_verified'] },
    });

    expect(isEmailVerificationRequiredError(error)).toBe(true);
    expect(isEmailVerificationRequiredError(new HttpErrorResponse({ status: 409 }))).toBe(false);
  });

  it('updates an existing cart with PATCH', () => {
    apiLinks.cartAddProduct('product-id', 2).subscribe();

    httpTestingController.expectOne(cartUrl).flush(cartResponse);
    const request = httpTestingController.expectOne(productUrl);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ id: 'product-id', quantity: 2 });
    request.flush(cartResponse);
  });

  it('creates a cart when none exists', () => {
    apiLinks.cartAddProduct('product-id', 1).subscribe();

    httpTestingController.expectOne(cartUrl).flush(
      { message: 'Cart not found' },
      { status: 404, statusText: 'Not Found' },
    );
    const request = httpTestingController.expectOne(productUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ id: 'product-id', quantity: 1 });
    request.flush(cartResponse);
  });

  it('creates a cart when EverREST reports that the user has no cart', () => {
    apiLinks.cartAddProduct('product-id', 1).subscribe();

    httpTestingController.expectOne(cartUrl).flush(
      { errorKeys: ['errors.user_has_no_cart'] },
      { status: 409, statusText: 'Conflict' },
    );
    const request = httpTestingController.expectOne(productUrl);
    expect(request.request.method).toBe('POST');
    request.flush(cartResponse);
  });

  it('clears the cart', () => {
    apiLinks.cartClear().subscribe();

    const request = httpTestingController.expectOne(cartUrl);
    expect(request.request.method).toBe('DELETE');
    request.flush({ success: true });
  });

  it('submits product ratings with the EverREST request shape', () => {
    apiLinks.productsRateProduct('product-id', 5).subscribe();

    const request = httpTestingController.expectOne(
      'https://api.everrest.educata.dev/shop/products/rate',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ productId: 'product-id', rate: 5 });
    request.flush({});
  });

  it('does not create a cart when updating an existing cart fails', () => {
    let responseError: unknown;
    apiLinks.cartAddProduct('product-id', 1).subscribe({
      error: (error: unknown) => (responseError = error),
    });

    httpTestingController.expectOne(cartUrl).flush(cartResponse);
    httpTestingController.expectOne(productUrl).flush(
      { message: 'Product not found' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(responseError).toBeInstanceOf(HttpErrorResponse);
    httpTestingController.expectNone(
      (request) => request.url === productUrl && request.method === 'POST',
    );
  });

  it('deletes a specific product using a request body', () => {
    apiLinks.cartProductDelete('product-id').subscribe();

    const request = httpTestingController.expectOne(productUrl);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ id: 'product-id' });
    request.flush(cartResponse);
  });

  it('checks out without a request body', () => {
    apiLinks.cartCheckoutPost().subscribe();

    const request = httpTestingController.expectOne(`${cartUrl}/checkout`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({ success: true, message: 'Cart checked out' });
  });

  it('creates an account with the complete sign-up request', () => {
    apiLinks.authSignUp(signUpRequest).subscribe();

    const request = httpTestingController.expectOne(`${authUrl}/sign_up`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(signUpRequest);
    request.flush({ _id: 'user-id' });
  });

  it('uses PATCH for profile and password changes', () => {
    apiLinks.authUpdateUser({ firstName: 'Alex' }).subscribe();
    const updateRequest = httpTestingController.expectOne(`${authUrl}/update`);
    expect(updateRequest.request.method).toBe('PATCH');
    updateRequest.flush({});

    apiLinks.authChangePassword({
      oldPassword: 'old-password',
      newPassword: 'new-password',
    }).subscribe();
    const passwordRequest = httpTestingController.expectOne(`${authUrl}/change_password`);
    expect(passwordRequest.request.method).toBe('PATCH');
    passwordRequest.flush({});
  });
});
