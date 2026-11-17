import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { forkJoin, map, Observable, of, shareReplay, switchMap } from 'rxjs';

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

    productsGetBrands(){
        return this.api.get<ProductBrand[]>('https://api.everrest.educata.dev/shop/products/brands')
    }
}

