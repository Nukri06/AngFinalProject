import { Component, signal } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { Filter } from '../filter/filter';
import { ProductFilterState } from '../filter/filter';
import { CategoriesProducts } from '../categories-products/categories-products';

@Component({
  imports: [Navbar, Filter, CategoriesProducts],
  selector: 'app-categories-xproducts',
  styleUrl: './categories-xproducts.css',
  templateUrl: './categories-xproducts.html',
})
export class CategoriesXproducts {
  readonly filters = signal<ProductFilterState>({
    brands: [],
    categories: [],
    currency: '',
    inStockOnly: false,
    maximumPrice: 0,
    minimumPrice: 0,
    minimumRating: 0,
    priceRangeActive: false,
  });

  updateFilters(filters: ProductFilterState): void {
    this.filters.set(filters);
  }
}
