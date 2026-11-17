import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-top-brands',
  styleUrl: './top-brands.css',
  templateUrl: './top-brands.html',
})
export class TopBrands {
  brands = [
    { name: 'Xbox', image: '/assets/brands/xbox.svg' },
    { name: 'Nintendo Switch', image: '/assets/brands/switch.webp' },
    { name: 'Samsung', image: '/assets/brands/samsung.webp' },
    { name: 'Razer', image: '/assets/brands/razer.svg' },
    { name: 'PlayStation', image: '/assets/brands/ps.webp' },
    { name: 'Nothing', image: '/assets/brands/nothing.webp' },
    { name: 'Xiaomi', image: '/assets/brands/MI.webp' },
    { name: 'Logitech', image: '/assets/brands/logitech.webp' },
    { name: 'Lenovo', image: '/assets/brands/Lenovo.png' },
    { name: 'Corsair', image: '/assets/brands/corsair.png' },
    { name: 'Apple', image: '/assets/brands/apple.svg' },
    { name: 'Acer', image: '/assets/brands/acer.webp' },
  ];
}
