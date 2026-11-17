import { Component, computed, inject, OnInit, output, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiLinks, Product, ProductCategory } from '../api-links';

export interface ProductFilterState {
  brands: string[];
  categories: string[];
  currency: string;
  inStockOnly: boolean;
  maximumPrice: number;
  minimumPrice: number;
  minimumRating: number;
  priceRangeActive: boolean;
}

@Component({
  selector: 'app-filter',
  styleUrl: './filter.css',
  templateUrl: './filter.html',
})
export class Filter implements OnInit {
  private readonly apiLinks = inject(ApiLinks);
  readonly filtersChanged = output<ProductFilterState>();

  readonly ratingOptions = [5, 4, 3, 2, 1];
  readonly stars = [1, 2, 3, 4, 5];

  readonly allProducts = signal<Product[]>([]);
  readonly categories = signal<ProductCategory[]>([]);
  readonly brands = signal<string[]>([]);
  readonly selectedBrands = signal<string[]>([]);
  readonly selectedCategories = signal<string[]>([]);
  readonly selectedCurrency = signal('');
  readonly priceRangeActive = signal(false);
  readonly minimumRating = signal(0);
  readonly inStockOnly = signal(false);
  readonly minPrice = signal(0);
  readonly maxPrice = signal(0);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly currencies = computed(() =>
    [...new Set(this.allProducts().map((product) => product.price.currency))].sort(),
  );

  readonly priceBounds = computed(() => {
    const prices = this.allProducts()
      .filter((product) => product.price.currency === this.selectedCurrency())
      .map((product) => product.price.current);

    return prices.length
      ? { min: Math.min(...prices), max: Math.max(...prices) }
      : { min: 0, max: 0 };
  });

  ngOnInit(): void {
    forkJoin({
      products: this.apiLinks.productsGetAllPages(8),
      categories: this.apiLinks.productsGetCategories(),
      brands: this.apiLinks.productsGetBrands(),
    }).subscribe({
      next: ({ products, categories, brands }) => {
        this.allProducts.set(products);
        this.categories.set([...categories].sort((a, b) => a.name.localeCompare(b.name)));
        this.brands.set([...brands].sort((a, b) => a.localeCompare(b)));

        const currency = this.currencies()[0] ?? '';
        this.selectedCurrency.set(currency);
        this.minPrice.set(this.priceBounds().min);
        this.maxPrice.set(this.priceBounds().max);
        this.isLoading.set(false);
        this.emitFilters();
      },
      error: () => {
        this.errorMessage.set('Could not load filter options. Please try again later.');
        this.isLoading.set(false);
      },
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(price);
  }

  changeCurrency(event: Event): void {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;

    this.selectedCurrency.set(select.value);
    this.minPrice.set(this.priceBounds().min);
    this.maxPrice.set(this.priceBounds().max);
    this.priceRangeActive.set(true);
    this.emitFilters();
  }

  changeMinimumPrice(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;

    const value = Number(input.value);
    if (Number.isFinite(value)) {
      this.minPrice.set(Math.min(value, this.maxPrice()));
      this.priceRangeActive.set(true);
      this.emitFilters();
    }
  }

  changeMaximumPrice(event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;

    const value = Number(input.value);
    if (Number.isFinite(value)) {
      this.maxPrice.set(Math.max(value, this.minPrice()));
      this.priceRangeActive.set(true);
      this.emitFilters();
    }
  }

  toggleBrand(brand: string, event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;

    this.selectedBrands.update((selected) =>
      input.checked
        ? [...selected, brand]
        : selected.filter((item) => item !== brand),
    );
    this.emitFilters();
  }

  toggleCategory(categoryId: string, event: Event): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;

    this.selectedCategories.update((selected) =>
      input.checked
        ? [...selected, categoryId]
        : selected.filter((item) => item !== categoryId),
    );
    this.emitFilters();
  }

  selectRating(rating: number): void {
    this.minimumRating.set(this.minimumRating() === rating ? 0 : rating);
    this.emitFilters();
  }

  toggleInStock(event: Event): void {
    const input = event.currentTarget;
    if (input instanceof HTMLInputElement) {
      this.inStockOnly.set(input.checked);
      this.emitFilters();
    }
  }

  resetFilters(): void {
    this.selectedBrands.set([]);
    this.selectedCategories.set([]);
    this.minimumRating.set(0);
    this.inStockOnly.set(false);
    this.priceRangeActive.set(false);
    this.selectedCurrency.set(this.currencies()[0] ?? '');
    this.minPrice.set(this.priceBounds().min);
    this.maxPrice.set(this.priceBounds().max);
    this.emitFilters();
  }

  private emitFilters(): void {
    this.filtersChanged.emit({
      brands: this.selectedBrands(),
      categories: this.selectedCategories(),
      currency: this.selectedCurrency(),
      inStockOnly: this.inStockOnly(),
      maximumPrice: this.maxPrice(),
      minimumPrice: this.minPrice(),
      minimumRating: this.minimumRating(),
      priceRangeActive: this.priceRangeActive(),
    });
  }
}
