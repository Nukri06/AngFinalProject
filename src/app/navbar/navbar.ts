import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-navbar',
  styleUrl: './navbar.css',
  templateUrl: './navbar.html',
})
export class Navbar {
  @Input() isLoggedIn = false;
  @Input() userName = 'Peter, P';

  refreshPage(): void {
    window.location.reload();
  }
}
