import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-blog',
  styleUrl: './blog.css',
  templateUrl: './blog.html',
})
export class Blog {
  articles = [
    {
      title: 'Video Games We Recommend',
      image: '/assets/videogamesWeRecommend.webp',
    },
    {
      title: 'Top 5 Laptops in 2026',
      image: '/assets/top laptops.jpe',
    },
  ];
}
