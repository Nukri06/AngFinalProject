import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface CarouselSlide {
  title: string;
  subtitle: string;
  category: string;
  description: string;
  image: string;
}

@Component({
  imports: [RouterLink],
  selector: 'app-carousel',
  styleUrl: './carousel.css',
  templateUrl: './carousel.html',
})
export class Carousel {
  carouselList: CarouselSlide[] = [
    {
      title: 'GTA VI',
      subtitle: 'Physical Version',
      category: 'Official Disc Release for PS5 & Xbox Series X',
      description:
        "Return to Vice City with the physical disc edition. Includes the official Leonida fold-out map, collector's case, and exclusive day-one bonus content",
      image: '/assets/gtavi.jpg',
    },
    {
      title: 'MacBook Pro',
      subtitle: 'Now with PROLED XDR Display',
      description: 'Unmatched brightness, true-to-life blacks, and extreme performance. Built for demanding creative workflows with a stunning edge-to-edge PROLED screen and all-day battery life.',
      image: '/assets/macbook pro.png',
      category: 'Laptops'
    },
    {
    title: 'iPhone 18 Pro Max',
    subtitle: 'Pro Camera System. Stunning New Finishes.',
    description: 'Engineered for ultimate power and photography. Available in four signature colors with an upgraded triple-lens camera array, titanium durability, and next-gen speed.',
    image: '/assets/iphone18.webp',
    category: 'Smartphones'
    },
    {
    title: 'iPhone Duo',
    subtitle: 'Two Displays. Infinite Possibilities.',
    description: 'Unfold a whole new way to multitask. Seamless dual-screen design meets flagship performance, giving you pocket-sized portability with a tablet-sized workspace.',
    image: '/assets/iphone duo.jpg',
    category: 'Smartphones'
    }
  ];

  currentSlideIndex = 0;

  get currentSlide(): CarouselSlide {
    return this.carouselList[this.currentSlideIndex];
  }

  nextSlide(): void {
    this.currentSlideIndex = (this.currentSlideIndex + 1) % this.carouselList.length;
  }

  previousSlide(): void {
    this.currentSlideIndex =
      (this.currentSlideIndex - 1 + this.carouselList.length) % this.carouselList.length;
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.carouselList.length) {
      this.currentSlideIndex = index;
    }
  }
}
