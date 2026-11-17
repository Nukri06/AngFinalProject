import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiLinks, CartResponse, Product, ProductsResponse } from '../api-links';
import { AuthSession } from '../auth-session';
import { Cart } from './cart';

const firstProduct: Product = {
  _id: 'product-1',
  title: 'Gaming Mouse',
  description: 'Wireless gaming mouse',
  issueDate: '2025-01-01',
  thumbnail: 'https://example.com/mouse.png',
  stock: 5,
  rating: 4.7,
  brand: 'GameGear',
  warranty: 2,
  images: [],
  price: { current: 59.99, currency: 'USD', beforeDiscount: 69.99, discountPercentage: 14 },
  category: { id: 'accessories', name: 'Accessories', image: '' },
};

const secondProduct: Product = {
  ...firstProduct,
  _id: 'product-2',
  title: 'Gaming Keyboard',
  thumbnail: 'https://example.com/keyboard.png',
};

const cartWithFirstProduct: CartResponse = {
  _id: 'cart-id',
  userId: 'user-id',
  createdAt: '2026-01-01T00:00:00.000Z',
  total: {
    price: { current: 59.99, beforeDiscount: 69.99 },
    quantity: 1,
    products: 1,
  },
  products: [
    { productId: firstProduct._id, quantity: 1, pricePerQuantity: 59.99, beforeDiscountPrice: 69.99 },
  ],
};

const cartWithBothProducts: CartResponse = {
  ...cartWithFirstProduct,
  total: {
    price: { current: 119.98, beforeDiscount: 139.98 },
    quantity: 2,
    products: 2,
  },
  products: [
    ...cartWithFirstProduct.products,
    { productId: secondProduct._id, quantity: 1, pricePerQuantity: 59.99, beforeDiscountPrice: 69.99 },
  ],
};

const emptyCart: CartResponse = {
  ...cartWithFirstProduct,
  total: { price: { current: 0, beforeDiscount: 0 }, quantity: 0, products: 0 },
  products: [],
};

const productsResponse: ProductsResponse = {
  total: 2,
  limit: 12,
  page: 1,
  skip: 0,
  products: [firstProduct, secondProduct],
};

describe('Cart', () => {
  const apiLinks = {
    authVerifyEmail: vi.fn(),
    cartAddProduct: vi.fn(),
    cartGet: vi.fn(),
    cartProductDelete: vi.fn(),
    productsGetAll: vi.fn(),
    productsGetById: vi.fn(),
  };
  let component: Cart;
  let authSession: AuthSession;

  beforeEach(() => {
    sessionStorage.clear();
    apiLinks.authVerifyEmail.mockReset().mockReturnValue(of({ status: 200, message: 'Sent' }));
    apiLinks.cartGet.mockReset().mockReturnValue(of(cartWithFirstProduct));
    apiLinks.cartAddProduct.mockReset().mockReturnValue(of(cartWithBothProducts));
    apiLinks.cartProductDelete.mockReset().mockReturnValue(of(emptyCart));
    apiLinks.productsGetAll.mockReset().mockReturnValue(of(productsResponse));
    apiLinks.productsGetById.mockReset().mockImplementation((id: string) =>
      of(id === secondProduct._id ? secondProduct : firstProduct),
    );

    TestBed.configureTestingModule({
      providers: [{ provide: ApiLinks, useValue: apiLinks }],
    });
    authSession = TestBed.inject(AuthSession);
    component = TestBed.runInInjectionContext(() => new Cart());
  });

  afterEach(() => sessionStorage.clear());

  it('loads cart products and resolves their details from the products API', () => {
    component.ngOnInit();

    expect(apiLinks.cartGet).toHaveBeenCalled();
    expect(apiLinks.productsGetById).toHaveBeenCalledWith(firstProduct._id);
    expect(component.items().map((item) => item.product.title)).toEqual([firstProduct.title]);
    expect(component.isLoading()).toBe(false);
  });

  it('shows an empty cart when EverREST reports there is no cart yet', () => {
    apiLinks.cartGet.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            statusText: 'Conflict',
            error: { errorKeys: ['errors.user_has_no_cart'] },
          }),
      ),
    );

    component.ngOnInit();

    expect(component.cart()).toBeNull();
    expect(component.items()).toEqual([]);
    expect(component.loadErrorMessage()).toBe('');
    expect(component.isLoading()).toBe(false);
    expect(apiLinks.productsGetAll).toHaveBeenCalled();
  });

  it('prompts email verification when the cart API rejects an unverified account', () => {
    apiLinks.cartGet.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            statusText: 'Conflict',
            error: { errorKeys: ['errors.user_email_not_verified'] },
          }),
      ),
    );

    component.ngOnInit();

    expect(component.requiresEmailVerification()).toBe(true);
    expect(component.loadErrorMessage()).toBe('');
  });

  it('requests a verification email for the signed-in account', () => {
    authSession.storeTokens(
      { access_token: 'access-token', refresh_token: 'refresh-token' },
      'player@example.com',
    );

    component.resendVerificationEmail();

    expect(apiLinks.authVerifyEmail).toHaveBeenCalledWith('player@example.com');
    expect(component.verificationMessage()).toContain('Check your inbox');
  });

  it('adds a recommended product and reloads the cart', () => {
    apiLinks.cartGet.mockReturnValueOnce(of(cartWithFirstProduct)).mockReturnValueOnce(of(cartWithBothProducts));
    apiLinks.productsGetById.mockImplementation((id: string) =>
      of(id === secondProduct._id ? secondProduct : firstProduct),
    );
    component.ngOnInit();

    component.addProduct(secondProduct);

    expect(apiLinks.cartAddProduct).toHaveBeenCalledWith(secondProduct._id, 1);
    expect(component.items().map((item) => item.product._id)).toEqual([
      firstProduct._id,
      secondProduct._id,
    ]);
  });

  it('removes a cart item using the cart API response', () => {
    component.ngOnInit();

    component.removeProduct(firstProduct._id);

    expect(apiLinks.cartProductDelete).toHaveBeenCalledWith(firstProduct._id);
    expect(component.items()).toEqual([]);
    expect(component.cart()?.total.quantity).toBe(0);
  });
});
