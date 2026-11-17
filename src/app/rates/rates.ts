import { Component } from '@angular/core';

interface Review {
  name: string;
  role: string;
  date: string;
  quote: string;
  rating: number;
}

@Component({
  imports: [],
  selector: 'app-rates',
  styleUrl: './rates.css',
  templateUrl: './rates.html',
})
export class Rates {
  readonly stars = [1, 2, 3, 4, 5];

  readonly reviews: Review[] = [
    {
      name: 'Jessica T.',
      role: 'Professional Esports Player',
      date: '5 days ago',
      quote: "Hands down the best investment I've made this year.",
      rating: 5,
    },
    {
      name: 'Sarah Jenkins',
      role: 'Content Creator',
      date: '2 days ago',
      quote: 'Absolutely in Love with this Purchase',
      rating: 5,
    },
    {
      name: 'Marcus Johnson',
      role: 'Gaming Enthusiast',
      date: 'just now',
      quote:
        'Great experience shopping here. The website is easy to navigate and the product descriptions are detailed.',
      rating: 4,
    },
  ];
}
