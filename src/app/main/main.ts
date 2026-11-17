import { Component } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { Carousel } from '../carousel/carousel';
import { RoundedCarousel } from '../rounded-carousel/rounded-carousel';
import { MainProducts } from '../main-products/main-products';
import { Ad } from '../ad/ad';
import { TopBrands } from '../top-brands/top-brands';
import { Blog } from '../blog/blog';
import { Rates } from '../rates/rates';
import { Footer } from '../footer/footer';

@Component({
  imports: [Navbar, Carousel, RoundedCarousel, MainProducts, Ad, TopBrands, Blog, Rates, Footer],
  selector: 'app-main',
  styleUrl: './main.css',
  templateUrl: './main.html',
})
export class Main {}
