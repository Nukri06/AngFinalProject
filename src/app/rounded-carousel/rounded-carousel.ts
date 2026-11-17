import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-rounded-carousel',
  styleUrl: './rounded-carousel.css',
  templateUrl: './rounded-carousel.html',
})
export class RoundedCarousel {
  imageList: string[] = [
    '/assets/smartphone-battery-replacement-service-social-media-cover-design-template_47987-25406.jpg',
    '/assets/cyber-week-ecommerce-banner-featuring-home-appliances-with-neon-light-accents_416256-121527.jpg',
    '/assets/black-friday-sale-social-media-banner-design-template_47987-25208.jpg',
    '/assets/black-friday-sale-poster-with-purple-background-purple-leds-black-friday-sale_1001840-13455.jpg',
  ];

  currentIndex = 0;

  get currentImage(): string {
    return this.imageList[this.currentIndex];
  }

  nextImage(): void {
    this.currentIndex = (this.currentIndex + 1) % this.imageList.length;
  }

  previousImage(): void {
    this.currentIndex =
      (this.currentIndex - 1 + this.imageList.length) % this.imageList.length;
  }

  goToImage(index: number): void {
    if (index >= 0 && index < this.imageList.length) {
      this.currentIndex = index;
    }
  }
}
