import { Component, HostListener, OnDestroy, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgClass } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NgClass],
  templateUrl: './public-layout.component.html',
})
export class PublicLayoutComponent implements OnDestroy {
  scrolled = signal(false);
  mobileMenuOpen = signal(false);
  showBackTop = signal(false);

  private routerSub: Subscription;

  constructor(private router: Router) {
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        window.scrollTo({ top: 0 });
        this.mobileMenuOpen.set(false);
      });
  }

  ngOnDestroy() { this.routerSub.unsubscribe(); }

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 60);
    this.showBackTop.set(window.scrollY > 400);
  }

  scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  navLinks = [
    { path: '/caracteristicas', label: 'Características' },
    { path: '/como-funciona',   label: 'Cómo Funciona'  },
    { path: '/personajes',      label: 'Personajes'      },
    { path: '/precios',         label: 'Precios'         },
    { path: '/faq',             label: 'FAQ'             },
  ];

  platformLinks = [
    { label: 'Características', path: '/caracteristicas' },
    { label: 'Cómo Funciona',   path: '/como-funciona'   },
    { label: 'Personajes',      path: '/personajes'      },
    { label: 'Precios',         path: '/precios'         },
  ];
  legalLinks   = ['Términos de Uso', 'Política de Privacidad', 'Cookies', 'GDPR'];
  supportLinks = ['Centro de Ayuda', 'Documentación', 'Estado del Sistema', 'Contacto'];
}
