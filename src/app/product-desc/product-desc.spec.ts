import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiLinks, ProductDetails, ProductsResponse } from '../api-links';
import { ProductDesc } from './product-desc';

const product: ProductDetails = {
  _id: 'product-id',
  title: 'Gaming Laptop',
  description: 'Gaming laptop',
  issueDate: '2025-01-01',
  thumbnail: 'https://example.com/laptop.png',
  stock: 5,
  rating: 4,
  brand: 'GameGear',
  warranty: 2,
  images: [],
  price: { current: 999, currency: 'USD', beforeDiscount: 1099, discountPercentage: 9 },
  category: { id: 'laptops', name: 'Laptops', image: '' },
  ratings: [],
};

const emptyProducts: ProductsResponse = {
  total: 0,
  limit: 50,
  page: 1,
  skip: 0,
  products: [],
};

describe('ProductDesc', () => {
  const apiLinks = {
    productsGetById: vi.fn(),
    productsGetCategoryById: vi.fn(),
    productsRateProduct: vi.fn(),
  };
  let component: ProductDesc;

  beforeEach(() => {
    apiLinks.productsGetById.mockReset().mockReturnValue(of(product));
    apiLinks.productsGetCategoryById.mockReset().mockReturnValue(of(emptyProducts));
    apiLinks.productsRateProduct.mockReset().mockReturnValue(of(product));

    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: product._id })) } },
        { provide: ApiLinks, useValue: apiLinks },
      ],
    });
    component = TestBed.runInInjectionContext(() => new ProductDesc());
  });

  it('prompts email verification when the rating API rejects an unverified account', () => {
    apiLinks.productsRateProduct.mockReturnValueOnce(
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
    component.selectRating(5);

    component.submitRating(product);

    expect(apiLinks.productsRateProduct).toHaveBeenCalledWith(product._id, 5);
    expect(component.requiresEmailVerification()).toBe(true);
    expect(component.ratingErrorMessage()).toBe('');
    expect(component.isSubmittingRating()).toBe(false);
  });
});
