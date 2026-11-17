import { Component, inject, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSession } from '../auth-session';

@Component({
  imports: [RouterLink],
  selector: 'app-navbar',
  styleUrl: './navbar.css',
  templateUrl: './navbar.html',
})
export class Navbar {
  readonly authSession = inject(AuthSession);
  @Input() isLoggedIn = false;
  @Input() userName = 'Peter, P';

  get signedInLabel(): string {
    return this.authSession.email()?.split('@')[0] || this.userName;
  }

  get signedInInitial(): string {
    return this.signedInLabel.charAt(0).toUpperCase();
  }
}
