import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiLinks, Product } from '../api-links';

type ProductSection = 'recommendations' | 'laptops' | 'phones';

@Component({
  imports: [],
  selector: 'app-main-products',
  styleUrl: './main-products.css',
  templateUrl: './main-products.html',
})
export class MainProducts implements OnInit {
  private readonly apiLinks = inject(ApiLinks);
  private readonly router = inject(Router);

  section = input<ProductSection>('recommendations');
  private readonly availableProducts = signal<Product[]>([]);
  sectionTitle = computed(() => {
    switch (this.section()) {
      case 'laptops':
        return 'Gaming Laptops';
      case 'phones':
        return 'Gaming Phones';
      default:
        return 'Recommendations';
    }
  });
  products = computed(() => {
    const section = this.section();
    const sectionProducts = this.availableProducts().filter((product) => {
      if (section === 'laptops') {
        return product.category.name.toLowerCase() === 'laptops';
      }

      if (section === 'phones') {
        return product.category.name.toLowerCase() === 'phones';
      }

      return true;
    });

    return sectionProducts.slice(0, 8);
  });
  isLoading = signal(true);
  errorMessage = signal('');

  ngOnInit(): void {
    this.apiLinks.productsGetAllPages(8).subscribe({
      next: (allProducts) => {
        const availableProducts = allProducts.filter((product) => product.stock > 0);
        this.availableProducts.set(this.shuffle(availableProducts));
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Product could not load. Try again');
        this.isLoading.set(false);
      },
    });
  }

  openProduct(product: Product): void {
    void this.router.navigate(['/product', product._id]);
  }

  private shuffle(products: Product[]): Product[] {
    const shuffled = [...products];

    for (let index = shuffled.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled;
  }
}
