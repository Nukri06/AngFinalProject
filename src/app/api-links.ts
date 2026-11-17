import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, shareReplay, switchMap, throwError } from 'rxjs';

export interface ProductPrice {
    current: number;
    currency: string;
    beforeDiscount: number;
    discountPercentage: number;
}

export interface ProductCategory {
    id: string;
    name: string;
    image: string;
}

export interface Product {
    _id: string;
    title: string;
    description: string;
    issueDate: string;
    thumbnail: string;
    stock: number;
    rating: number;
    brand: string;
    warranty: number;
    images: string[];
    price: ProductPrice;
    category: ProductCategory;
}

export interface ProductRating {
    userId: string;
    value: number;
    createdAt: string;
}

export interface ProductRatingRequest {
    productId: string;
    rate: number;
}

export interface CartProductRequest {
    id: string;
    quantity: number;
}

export interface CartProductDeleteRequest {
    id: string;
}

export interface CartLineItem {
    quantity: number;
    pricePerQuantity: number;
    beforeDiscountPrice: number;
    productId: string;
}

export interface CartTotal {
    price: {
        current: number;
        beforeDiscount: number;
    };
    quantity: number;
    products: number;
}

export interface CartResponse {
    _id: string;
    userId: string;
    createdAt: string;
    total: CartTotal;
    products: CartLineItem[];
    __v?: number;
}

export function isEmailVerificationRequiredError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) return false;
    if (error.status !== 409) return false;
    return hasEverRestErrorKey(error, 'errors.user_email_not_verified');
}

export function isCartMissingError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) return false;
    if (error.status === 404) return true;
    return (
        error.status === 409 &&
        (hasEverRestErrorKey(error, 'errors.user_has_no_cart') ||
            hasEverRestErrorKey(error, 'errors.user_cart_not_exists'))
    );
}

function hasEverRestErrorKey(error: HttpErrorResponse, key: string): boolean {
    if (typeof error.error !== 'object' || error.error === null || !('errorKeys' in error.error)) {
        return false;
    }

    const errorKeys = error.error.errorKeys;
    return Array.isArray(errorKeys) && errorKeys.includes(key);
}

export interface CartClearResponse {
    success: boolean;
}

export interface CartCheckoutResponse extends CartClearResponse {
    message: string;
}

export type AuthGender = 'MALE' | 'FEMALE' | 'OTHER';
export type AuthUserRole = 'default' | 'admin';
export type AuthUserGender = AuthGender | Lowercase<AuthGender>;

export interface AuthSignUpRequest {
    firstName: string;
    lastName: string;
    age: number;
    email: string;
    password: string;
    address: string;
    phone: string;
    zipcode: string;
    avatar: string;
    gender: AuthGender;
}

export interface AuthUser {
    _id: string;
    firstName: string;
    lastName: string;
    age: number;
    email: string;
    address: string;
    role: AuthUserRole;
    zipcode: string;
    avatar: string;
    gender: AuthUserGender;
    phone: string;
    verified: boolean;
    iat?: number;
    exp?: number;
    cartID?: string;
}

export interface AuthSignUpLimitResponse {
    deleted: number;
    deletedCarts?: number;
    message: string;
}

export type AuthSignUpResponse = AuthUser | AuthSignUpLimitResponse;

export interface AuthSignInRequest {
    email: string;
    password: string;
}

export interface AuthTokensResponse {
    access_token: string;
    refresh_token: string;
}

export interface AuthRefreshResponse {
    access_token: string;
}

export interface AuthEmailRequest {
    email: string;
}

export interface AuthMessageResponse {
    status: number;
    message: string;
}

export interface AuthUsersResponse {
    total: number;
    limit: number;
    page: number;
    skip: number;
    users: AuthUser[];
}

export interface AuthUpdateUserRequest {
    firstName?: string;
    lastName?: string;
    age?: number;
    address?: string;
    phone?: string;
    zipcode?: string;
    avatar?: string;
    gender?: AuthGender;
}

export interface AuthChangePasswordRequest {
    oldPassword: string;
    newPassword: string;
}

export interface AuthDeleteResponse {
    acknowledged: boolean;
}

export interface ProductDetails extends Product {
    ratings: ProductRating[];
}

export interface ProductsResponse {
    total: number;
    limit: number;
    page: number;
    skip: number;
    products: Product[];
}

export type ProductBrand = string;

@Service()
export class ApiLinks {
    private api=inject(HttpClient)
    private productsCache?: Observable<Product[]>;

    productsGetAll(pageIndex = 1, pageSize = 8){
        const params = new HttpParams()
            .set('page_index', pageIndex)
            .set('page_size', pageSize);
        return this.api.get<ProductsResponse>('https://api.everrest.educata.dev/shop/products/all', { params })
    }

    productsGetById(id: string) {
        return this.api.get<ProductDetails>(`https://api.everrest.educata.dev/shop/products/id/${encodeURIComponent(id)}`);
    }

    productsRateProduct(productId: string, rate: number) {
        const body: ProductRatingRequest = { productId, rate };
        return this.api.post<Product>(
            'https://api.everrest.educata.dev/shop/products/rate',
            body,
        );
    }

    cartGet() {
        return this.api.get<CartResponse>('https://api.everrest.educata.dev/shop/cart');
    }

    cartClear() {
        return this.api.delete<CartClearResponse>('https://api.everrest.educata.dev/shop/cart');
    }

    cartProductPost(id: string, quantity: number) {
        const body: CartProductRequest = { id, quantity };
        return this.api.post<CartResponse>(
            'https://api.everrest.educata.dev/shop/cart/product',
            body,
        );
    }

    cartProductPatch(id: string, quantity: number) {
        const body: CartProductRequest = { id, quantity };
        return this.api.patch<CartResponse>(
            'https://api.everrest.educata.dev/shop/cart/product',
            body,
        );
    }

    cartProductDelete(id: string) {
        const body: CartProductDeleteRequest = { id };
        return this.api.delete<CartResponse>(
            'https://api.everrest.educata.dev/shop/cart/product',
            { body },
        );
    }

    cartCheckoutPost() {
        return this.api.post<CartCheckoutResponse>(
            'https://api.everrest.educata.dev/shop/cart/checkout',
            null,
        );
    }

    cartAddProduct(id: string, quantity: number): Observable<CartResponse> {
        return this.cartGet().pipe(
            map(() => true),
            catchError((error: unknown) => {
                if (isCartMissingError(error)) {
                    return of(false);
                }

                return throwError(() => error);
            }),
            switchMap((cartExists) =>
                cartExists
                    ? this.cartProductPatch(id, quantity)
                    : this.cartProductPost(id, quantity),
            ),
        );
    }

    productsGetAllPages(pageSize = 8): Observable<Product[]> {
        if (!this.productsCache) {
            this.productsCache = this.productsGetAll(1, pageSize).pipe(
                switchMap((firstPage) => {
                    const pageCount = Math.ceil(firstPage.total / firstPage.limit);
                    const remainingPages = Array.from(
                        { length: Math.max(0, pageCount - 1) },
                        (_, index) => this.productsGetAll(index + 2, pageSize),
                    );

                    if (remainingPages.length === 0) {
                        return of(firstPage.products);
                    }

                    return forkJoin(remainingPages).pipe(
                        map((pages) => [firstPage, ...pages].flatMap((page) => page.products)),
                    );
                }),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        }

        return this.productsCache;
    }
    
    productsGetCategories(){
        return this.api.get<ProductCategory[]>('https://api.everrest.educata.dev/shop/products/categories')
    }

    productsGetCategoryById(categoryId: string, pageIndex = 1, pageSize = 8) {
        const params = new HttpParams()
            .set('page_index', pageIndex)
            .set('page_size', pageSize);
        return this.api.get<ProductsResponse>(
            `https://api.everrest.educata.dev/shop/products/category/${encodeURIComponent(categoryId)}`,
            { params },
        );
    }

    productsGetBrands(){
        return this.api.get<ProductBrand[]>('https://api.everrest.educata.dev/shop/products/brands')
    }
    productsGetBrandByName(brandName: string, pageIndex = 1, pageSize = 8) {
        const params = new HttpParams()
            .set('page_index', pageIndex)
            .set('page_size', pageSize);
        return this.api.get<ProductsResponse>(
            `https://api.everrest.educata.dev/shop/products/brand/${encodeURIComponent(brandName)}`,
            { params },
        );
    }

    authGetCurrentUser() {
        return this.api.get<AuthUser>('https://api.everrest.educata.dev/auth');
    }

    authGetUserById(id: string) {
        return this.api.get<AuthUser>(
            `https://api.everrest.educata.dev/auth/id/${encodeURIComponent(id)}`,
        );
    }

    authGetAllUsers(pageIndex = 1, pageSize = 8) {
        const params = new HttpParams()
            .set('page_index', pageIndex)
            .set('page_size', pageSize);
        return this.api.get<AuthUsersResponse>(
            'https://api.everrest.educata.dev/auth/all',
            { params },
        );
    }

    authSignUp(body: AuthSignUpRequest) {
        return this.api.post<AuthSignUpResponse>(
            'https://api.everrest.educata.dev/auth/sign_up',
            body,
        );
    }

    authSignIn(body: AuthSignInRequest) {
        return this.api.post<AuthTokensResponse>(
            'https://api.everrest.educata.dev/auth/sign_in',
            body,
        );
    }

    authSignOut() {
        return this.api.post<string>('https://api.everrest.educata.dev/auth/sign_out', null);
    }

    authRefresh(refreshToken?: string) {
        const body = refreshToken ? { refresh_token: refreshToken } : null;
        return this.api.post<AuthRefreshResponse>(
            'https://api.everrest.educata.dev/auth/refresh',
            body,
        );
    }

    authVerifyEmail(email: string) {
        const body: AuthEmailRequest = { email };
        return this.api.post<AuthMessageResponse>(
            'https://api.everrest.educata.dev/auth/verify_email',
            body,
        );
    }

    authRecoverPassword(email: string) {
        const body: AuthEmailRequest = { email };
        return this.api.post<AuthMessageResponse>(
            'https://api.everrest.educata.dev/auth/recovery',
            body,
        );
    }

    authUpdateUser(body: AuthUpdateUserRequest) {
        return this.api.patch<AuthUser>(
            'https://api.everrest.educata.dev/auth/update',
            body,
        );
    }

    authChangePassword(body: AuthChangePasswordRequest) {
        return this.api.patch<AuthTokensResponse>(
            'https://api.everrest.educata.dev/auth/change_password',
            body,
        );
    }

    authDeleteCurrentUser() {
        return this.api.delete<AuthDeleteResponse>(
            'https://api.everrest.educata.dev/auth/delete',
        );
    }
}

