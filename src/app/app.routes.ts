import { Routes } from '@angular/router';
import { LogIn } from './log-in/log-in';
import { Register } from './register/register';
import { Main } from './main/main';
import { CategoriesXproducts } from './categories-xproducts/categories-xproducts';
import { ProductDesc } from './product-desc/product-desc';

export const routes: Routes = [
  { path: '', component: Main, pathMatch: 'full' },
  { path: 'categoriesXproducts', component: CategoriesXproducts },
  { path: 'product/:id', component: ProductDesc },
  { path: 'log-in', component: LogIn },
  { path: 'register', component: Register },
];
