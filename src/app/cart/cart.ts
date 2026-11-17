import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import {
  ApiLinks,
  CartLineItem,
  CartResponse,
  isCartMissingError,
  isEmailVerificationRequiredError,
  Product,
} from '../api-links';
import { AuthSession } from '../auth-session';
import { Footer } from '../footer/footer';
import { Navbar } from '../navbar/navbar';

interface CartItemViewModel {
  line: CartLineItem;
  product: Product;
}

interface CartPageData {
  cart: CartResponse;
  items: CartItemViewModel[];
}

@Component({
  imports: [RouterLink, Navbar, Footer],
  selector: 'app-cart',
  styleUrl: './cart.css',
  templateUrl: './cart.html',
})
export class Cart implements OnInit {
  private readonly apiLinks = inject(ApiLinks);
  readonly authSession = inject(AuthSession);

  readonly cart = signal<CartResponse | null>(null);
  readonly items = signal<CartItemViewModel[]>([]);
  readonly recommendations = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly isLoadingRecommendations = signal(false);
  readonly isUpdating = signal(false);
  readonly requiresSignIn = signal(false);
  readonly requiresEmailVerification = signal(false);
  readonly isSendingVerificationEmail = signal(false);
  readonly isRefreshingVerifiedSession = signal(false);
  readonly loadErrorMessage = signal('');
  readonly operationErrorMessage = signal('');
  readonly recommendationErrorMessage = signal('');
  readonly verificationMessage = signal('');
  readonly verificationErrorMessage = signal('');

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.isLoading.set(true);
    this.requiresSignIn.set(false);
    this.requiresEmailVerification.set(false);
    this.loadErrorMessage.set('');
    this.operationErrorMessage.set('');

    this.apiLinks
      .cartGet()
      .pipe(switchMap((cart) => this.loadProductDetails(cart)))
      .subscribe({
        next: ({ cart, items }) => {
          this.cart.set(cart);
          this.items.set(items);
          this.isLoading.set(false);
          this.loadRecommendations(new Set(items.map((item) => item.line.productId)));
        },
        error: (error: unknown) => {
          this.isLoading.set(false);
          if (isCartMissingError(error)) {
            this.cart.set(null);
            this.items.set([]);
            this.loadRecommendations(new Set());
            return;
          }
          if (isEmailVerificationRequiredError(error)) {
            this.requiresEmailVerification.set(true);
            return;
          }
          if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
            this.requiresSignIn.set(true);
            return;
          }

          this.loadErrorMessage.set('Your cart could not be loaded. Please try again.');
        },
      });
  }

  addProduct(product: Product): void {
    if (this.isUpdating()) return;

    this.isUpdating.set(true);
    this.operationErrorMessage.set('');
    this.apiLinks.cartAddProduct(product._id, 1).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.loadCart();
      },
      error: (error: unknown) => {
        this.isUpdating.set(false);
        if (isEmailVerificationRequiredError(error)) {
          this.requiresEmailVerification.set(true);
          return;
        }
        this.operationErrorMessage.set(this.mutationError(error, 'Could not add this product.'));
      },
    });
  }

  removeProduct(productId: string): void {
    if (this.isUpdating()) return;

    this.isUpdating.set(true);
    this.operationErrorMessage.set('');
    this.apiLinks.cartProductDelete(productId).subscribe({
      next: (cart) => {
        this.cart.set(cart);
        const remainingItems = new Map(
          this.items().map((item) => [item.line.productId, item.product]),
        );
        this.items.set(
          cart.products.flatMap((line) => {
            const product = remainingItems.get(line.productId);
            return product ? [{ line, product }] : [];
          }),
        );
        this.isUpdating.set(false);
        this.loadRecommendations(new Set(cart.products.map((line) => line.productId)));
      },
      error: (error: unknown) => {
        this.isUpdating.set(false);
        if (isEmailVerificationRequiredError(error)) {
          this.requiresEmailVerification.set(true);
          return;
        }
        this.operationErrorMessage.set(this.mutationError(error, 'Could not remove this product.'));
      },
    });
  }

  resendVerificationEmail(): void {
    const email = this.authSession.email();
    if (!email || this.isSendingVerificationEmail()) {
      if (!email) this.verificationErrorMessage.set('Sign in again to request a verification email.');
      return;
    }

    this.isSendingVerificationEmail.set(true);
    this.verificationMessage.set('');
    this.verificationErrorMessage.set('');
    this.apiLinks.authVerifyEmail(email).subscribe({
      next: () => {
        this.isSendingVerificationEmail.set(false);
        this.verificationMessage.set('Verification email sent. Check your inbox and spam folder.');
      },
      error: () => {
        this.isSendingVerificationEmail.set(false);
        this.verificationErrorMessage.set('Could not send the verification email. Please try again.');
      },
    });
  }

  refreshVerifiedSession(): void {
    const refreshToken = this.authSession.refreshToken();
    if (this.isRefreshingVerifiedSession()) return;
    if (!refreshToken) {
      this.authSession.clear();
      this.requiresEmailVerification.set(false);
      this.requiresSignIn.set(true);
      return;
    }

    this.isRefreshingVerifiedSession.set(true);
    this.verificationErrorMessage.set('');
    this.apiLinks.authRefresh(refreshToken).subscribe({
      next: (response) => {
        this.isRefreshingVerifiedSession.set(false);
        if (!this.authSession.updateAccessToken(response.access_token)) {
          this.verificationErrorMessage.set('Could not update your session. Sign in again.');
          return;
        }
        this.loadCart();
      },
      error: (error: unknown) => {
        this.isRefreshingVerifiedSession.set(false);
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          this.authSession.clear();
          this.requiresEmailVerification.set(false);
          this.requiresSignIn.set(true);
          return;
        }
        this.verificationErrorMessage.set('Could not refresh your session. Please try again.');
      },
    });
  }

  formatPrice(amount: number, currency: string): string {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formattedAmount} ${currency || 'USD'}`;
  }

  onImageError(event: Event): void {
    const image = event.currentTarget;
    if (image instanceof HTMLImageElement) {
      image.hidden = true;
      image.parentElement?.setAttribute('data-placeholder', 'Image unavailable');
    }
  }

  private loadProductDetails(cart: CartResponse): Observable<CartPageData> {
    if (cart.products.length === 0) return of({ cart, items: [] });

    return forkJoin(
      cart.products.map((line) =>
        this.apiLinks.productsGetById(line.productId).pipe(
          map((product) => ({ line, product })),
        ),
      ),
    ).pipe(map((items) => ({ cart, items })));
  }

  private loadRecommendations(cartProductIds: Set<string>): void {
    this.isLoadingRecommendations.set(true);
    this.recommendationErrorMessage.set('');
    this.apiLinks.productsGetAll(1, 12).subscribe({
      next: (response) => {
        this.recommendations.set(
          response.products
            .filter((product) => product.stock > 0 && !cartProductIds.has(product._id))
            .slice(0, 4),
        );
        this.isLoadingRecommendations.set(false);
      },
      error: () => {
        this.recommendationErrorMessage.set(
          'Recommended products could not be loaded right now.',
        );
        this.isLoadingRecommendations.set(false);
      },
    });
  }

  private mutationError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      return 'Your session has expired. Sign in again to update your cart.';
    }

    return `${fallback} Please try again.`;
  }
}
