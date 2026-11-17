import { Component, computed, inject, input, OnChanges, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiLinks, Product } from '../api-links';
import { ProductFilterState } from '../filter/filter';

type ProductSort = 'popular' | 'price-low' | 'price-high' | 'newest';

@Component({
  selector: 'app-categories-products',
  styleUrl: './categories-products.css',
  templateUrl: './categories-products.html',
})
export class CategoriesProducts implements OnChanges, OnInit {
  private readonly apiLinks = inject(ApiLinks);
  private readonly router = inject(Router);

  readonly filters = input.required<ProductFilterState>();
  readonly sortOrder = signal<ProductSort>('popular');
  readonly currentPage = signal(1);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  private readonly allProducts = signal<Product[]>([]);
  private readonly pageSize = 8;

  readonly filteredProducts = computed(() => {
    const filters = this.filters();
    const products = this.allProducts().filter((product) => {
      const matchesBrand =
        filters.brands.length === 0 || filters.brands.includes(product.brand);
      const matchesCategory =
        filters.categories.length === 0 || filters.categories.includes(product.category.id);
      const matchesPrice =
        !filters.priceRangeActive ||
        (product.price.currency === filters.currency &&
          product.price.current >= filters.minimumPrice &&
          product.price.current <= filters.maximumPrice);
      const matchesRating = product.rating >= filters.minimumRating;
      const matchesAvailability = !filters.inStockOnly || product.stock > 0;

      return (
        matchesBrand &&
        matchesCategory &&
        matchesPrice &&
        matchesRating &&
        matchesAvailability
      );
    });

    return products.sort((first, second) => {
      switch (this.sortOrder()) {
        case 'price-low':
          return (
            first.price.currency.localeCompare(second.price.currency) ||
            first.price.current - second.price.current
          );
        case 'price-high':
          return (
            first.price.currency.localeCompare(second.price.currency) ||
            second.price.current - first.price.current
          );
        case 'newest':
          return new Date(second.issueDate).getTime() - new Date(first.issueDate).getTime();
        default:
          return second.rating - first.rating;
      }
    });
  });

  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredProducts().length / this.pageSize)),
  );

  readonly pageNumbers = computed(() => {
    const count = this.pageCount();
    const current = this.currentPage();
    const start = Math.max(1, Math.min(current - 2, count - 4));
    const end = Math.min(count, start + 4);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  readonly pageProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredProducts().slice(start, start + this.pageSize);
  });

  readonly categoryTitle = computed(() => {
    const selectedCategories = this.filters().categories;
    if (selectedCategories.length !== 1) return 'Products';

    return (
      this.allProducts().find((product) => product.category.id === selectedCategories[0])
        ?.category.name ?? 'Products'
    );
  });

  ngOnChanges(): void {
    this.currentPage.set(1);
  }

  ngOnInit(): void {
    this.apiLinks.productsGetAllPages(8).subscribe({
      next: (products) => {
        this.allProducts.set(products);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Products could not be loaded. Please try again later.');
        this.isLoading.set(false);
      },
    });
  }

  changeSort(event: Event): void {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;

    const value = select.value;
    if (
      value === 'popular' ||
      value === 'price-low' ||
      value === 'price-high' ||
      value === 'newest'
    ) {
      this.sortOrder.set(value);
      this.currentPage.set(1);
    }
  }

  goToPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(page, 1), this.pageCount()));
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(price);
  }

  openProduct(product: Product): void {
    void this.router.navigate(['/product', product._id]);
  }
}
