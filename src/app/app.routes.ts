import { Routes } from '@angular/router';
import { LogIn } from './log-in/log-in';
import { Register } from './register/register';

export const routes: Routes = [
  { path: 'log-in', component: LogIn },
  { path: 'register', component: Register },
];
