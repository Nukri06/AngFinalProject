import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { filter, map, switchMap } from 'rxjs';
import { ApiLinks, Product, ProductDetails } from '../api-links';
import { Navbar } from '../navbar/navbar';
import { Blog } from '../blog/blog';
import { Footer } from '../footer/footer';

@Component({
  imports: [Navbar, RouterLink, Blog, Footer],
  selector: 'app-product-desc',
  styleUrl: './product-desc.css',
  templateUrl: './product-desc.html',
})
export class ProductDesc implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly apiLinks = inject(ApiLinks);

  readonly product = signal<ProductDetails | null>(null);
  readonly productImages = computed(() => {
    const item = this.product();
    if (!item) return [];

    return [...new Set([...(item.images ?? []), item.thumbnail].filter(Boolean))];
  });
  readonly activeImageIndex = signal(0);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly similarProducts = signal<Product[]>([]);
  readonly isSimilarLoading = signal(true);
  readonly similarErrorMessage = signal('');
  readonly quantity = signal(1);
  readonly isAddingToCart = signal(false);
  readonly cartMessage = signal('');
  readonly cartErrorMessage = signal('');
  readonly selectedRating = signal(0);
  readonly isSubmittingRating = signal(false);
  readonly ratingMessage = signal('');
  readonly ratingErrorMessage = signal('');
  readonly ratingRefreshMessage = signal('');
  readonly ratingOptions = [1, 2, 3, 4, 5];
  readonly quantityOptions = [1, 2, 3, 4, 5];

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        filter((id): id is string => id !== null),
        switchMap((id) => {
          this.product.set(null);
          this.activeImageIndex.set(0);
          this.isLoading.set(true);
          this.errorMessage.set('');
          this.isSimilarLoading.set(true);
          this.similarErrorMessage.set('');
          this.similarProducts.set([]);
          this.quantity.set(1);
          this.isAddingToCart.set(false);
          this.cartMessage.set('');
          this.cartErrorMessage.set('');
          this.selectedRating.set(0);
          this.isSubmittingRating.set(false);
          this.ratingMessage.set('');
          this.ratingErrorMessage.set('');
          this.ratingRefreshMessage.set('');
          return this.apiLinks.productsGetById(id);
        }),
      )
      .subscribe({
        next: (product) => {
          this.product.set(product);
          this.isLoading.set(false);
          this.quantity.set(1);
          this.loadSimilarProducts(product);
        },
        error: () => {
          this.errorMessage.set('Product details could not be loaded. Please try again later.');
          this.isLoading.set(false);
          this.isSimilarLoading.set(false);
        },
      });
  }

  changeQuantity(event: Event, stock: number): void {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;

    const value = Number(select.value);
    if (!Number.isInteger(value) || value < 1 || value > Math.min(stock, 5)) {
      this.cartErrorMessage.set('Choose a quantity available in stock.');
      return;
    }

    this.quantity.set(value);
    this.cartErrorMessage.set('');
  }

  onSimilarImageError(event: Event, item: Product): void {
    const image = event.currentTarget;
    if (!(image instanceof HTMLImageElement)) return;

    if (image.getAttribute('src') !== item.thumbnail) {
      image.src = item.thumbnail;
      return;
    }

    image.hidden = true;
  }

  selectImage(index: number): void {
    if (index >= 0 && index < this.productImages().length) {
      this.activeImageIndex.set(index);
    }
  }

  addToCart(item: ProductDetails): void {
    if (this.isAddingToCart()) return;

    if (item.stock < 1 || this.quantity() > item.stock) {
      this.cartErrorMessage.set('This quantity is not available in stock.');
      return;
    }

    this.isAddingToCart.set(true);
    this.cartMessage.set('');
    this.cartErrorMessage.set('');
    this.apiLinks.productsAddToCart(item._id, this.quantity()).subscribe({
      next: () => {
        if (this.product()?._id !== item._id) return;

        this.cartMessage.set('Product added to cart.');
        this.isAddingToCart.set(false);
      },
      error: () => {
        if (this.product()?._id !== item._id) return;

        this.cartErrorMessage.set('Could not add this product to the cart. Please try again.');
        this.isAddingToCart.set(false);
      },
    });
  }

  selectRating(rating: number): void {
    if (!this.ratingOptions.includes(rating)) return;

    this.selectedRating.set(rating);
    this.ratingMessage.set('');
    this.ratingErrorMessage.set('');
    this.ratingRefreshMessage.set('');
  }

  submitRating(item: ProductDetails): void {
    const rate = this.selectedRating();
    if (this.isSubmittingRating()) return;

    if (!Number.isInteger(rate) || rate < 1 || rate > 5) {
      this.ratingErrorMessage.set('Select a rating from 1 to 5 stars.');
      return;
    }

    this.isSubmittingRating.set(true);
    this.ratingMessage.set('');
    this.ratingErrorMessage.set('');
    this.ratingRefreshMessage.set('');
    this.apiLinks.productsRateProduct(item._id, rate).subscribe({
      next: () => {
        if (this.product()?._id !== item._id) return;

        this.ratingMessage.set('Thank you. Your rating was submitted.');
        this.isSubmittingRating.set(false);
        this.apiLinks.productsGetById(item._id).subscribe({
          next: (updatedProduct) => {
            if (this.product()?._id === item._id) this.product.set(updatedProduct);
          },
          error: () => {
            if (this.product()?._id !== item._id) return;

            this.ratingRefreshMessage.set(
              'Your rating was submitted, but the updated summary could not be loaded.',
            );
          },
        });
      },
      error: (error: unknown) => {
        if (this.product()?._id !== item._id) return;

        this.ratingErrorMessage.set(
          error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)
            ? 'Sign in to submit a rating.'
            : 'Could not submit your rating. Please try again.',
        );
        this.isSubmittingRating.set(false);
      },
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(price);
  }

  formatRating(rating: number): string {
    return rating.toFixed(1);
  }

  private loadSimilarProducts(item: ProductDetails): void {
    this.apiLinks.productsGetCategoryById(item.category.id, 1, 50).subscribe({
      next: (response) => {
        if (this.product()?._id !== item._id) return;

        const brand = item.brand.toLowerCase();
        const similar = response.products
          .filter((product) => product._id !== item._id && product.stock > 0)
          .sort(
            (first, second) =>
              Number(second.brand.toLowerCase() === brand) -
                Number(first.brand.toLowerCase() === brand) ||
              second.rating - first.rating,
          )
          .slice(0, 4);

        this.similarProducts.set(similar);
        this.isSimilarLoading.set(false);
      },
      error: () => {
        if (this.product()?._id !== item._id) return;

        this.similarErrorMessage.set('Similar products could not be loaded. Please try again later.');
        this.isSimilarLoading.set(false);
      },
    });
  }
}
