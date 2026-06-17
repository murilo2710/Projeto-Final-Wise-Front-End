import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { AuthService } from '../../../services/auth.service';

interface PassoTour {
  alvo: string;
  titulo: string;
  descricao: string;
}

const STORAGE_KEY_PREFIX = 'sistemaodonto.onboarding.v1';

@Component({
  selector: 'app-onboarding-tour',
  imports: [],
  templateUrl: './onboarding-tour.html',
  styleUrl: './onboarding-tour.css'
})
export class OnboardingTourComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private routerSub?: Subscription;

  protected readonly visivel = signal(false);
  protected readonly indice = signal(0);
  protected readonly alvoRect = signal<DOMRect | null>(null);
  protected readonly cardTop = signal(0);
  protected readonly cardLeft = signal(0);
  protected readonly arrowTop = signal(0);
  protected readonly arrowLeft = signal(false);

  protected readonly passos: PassoTour[] = [
    {
      alvo: '[data-tour="logo"]',
      titulo: 'Bem-vindo ao OdontoFlow!',
      descricao: 'Vamos fazer um tour rápido pelas principais áreas do sistema.'
    },
    {
      alvo: '[data-tour="dashboard"]',
      titulo: 'Seu painel de controle',
      descricao: 'Acompanhe consultas, pacientes e os principais indicadores da clínica em um só lugar.'
    },
    {
      alvo: '[data-tour="consultas"]',
      titulo: 'Agende consultas',
      descricao: 'Crie, edite e cancele consultas dos seus pacientes com poucos cliques.'
    },
    {
      alvo: '[data-tour="pacientes"]',
      titulo: 'Cadastre seus pacientes',
      descricao: 'Mantenha o cadastro completo de cada paciente sempre atualizado.'
    },
    {
      alvo: '[data-tour="dentistas"]',
      titulo: 'Gerencie a equipe',
      descricao: 'Cadastre dentistas e vincule as especialidades de cada profissional.'
    },
    {
      alvo: '[data-tour="especialidades"]',
      titulo: 'Defina as especialidades',
      descricao: 'Cadastre as especialidades atendidas e use-as nos dentistas e materiais.'
    },
    {
      alvo: '[data-tour="materiais"]',
      titulo: 'Controle o estoque',
      descricao: 'Acompanhe os materiais e receba alertas quando o estoque estiver baixo.'
    },
    {
      alvo: '[data-tour="relatorios"]',
      titulo: 'Extraia relatórios',
      descricao: 'Filtre e analise os atendimentos para tomar decisões com mais segurança.'
    }
  ];

  protected readonly total = this.passos.length;
  protected readonly passoAtual = computed(() => this.passos[this.indice()]);
  protected readonly ehUltimo = computed(() => this.indice() === this.total - 1);

  ngOnInit(): void {
    this.routerSub = this.router.events
      .pipe(filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd))
      .subscribe((evento) => this.avaliarRota(evento.urlAfterRedirects));

    setTimeout(() => this.avaliarRota(this.router.url), 300);
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.liberarScroll();
  }

  protected proximo(): void {
    if (this.ehUltimo()) {
      this.finalizar();
      return;
    }

    this.indice.update((valor) => valor + 1);
    this.reposicionar();
  }

  protected pular(): void {
    this.finalizar();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  protected aoRedimensionar(): void {
    if (this.visivel()) {
      this.reposicionar();
    }
  }

  private avaliarRota(url: string): void {
    if (this.visivel() || this.jaViu() || url.startsWith('/login') || !this.authService.usuario()) {
      return;
    }

    setTimeout(() => this.iniciar(), 400);
  }

  private iniciar(): void {
    if (this.jaViu()) {
      return;
    }

    this.indice.set(0);

    if (!this.posicionar()) {
      return;
    }

    this.bloquearScroll();
    this.visivel.set(true);
    requestAnimationFrame(() => this.ajustarCard());
  }

  private reposicionar(): void {
    if (this.posicionar()) {
      requestAnimationFrame(() => this.ajustarCard());
    }
  }

  private posicionar(): boolean {
    const elemento = document.querySelector(this.passoAtual().alvo);

    if (!elemento) {
      this.alvoRect.set(null);
      return false;
    }

    const rect = elemento.getBoundingClientRect();
    const centro = rect.top + rect.height / 2;

    this.alvoRect.set(rect);

    if (this.isMobile()) {
      this.cardTop.set(Math.max(12, rect.top - 260));
      this.cardLeft.set(12);
      this.arrowTop.set(0);
      this.arrowLeft.set(false);
      return true;
    }

    this.cardTop.set(Math.max(14, centro - 110));
    this.cardLeft.set(rect.right + 22);
    this.arrowTop.set(centro - this.cardTop());
    this.arrowLeft.set(true);
    return true;
  }

  private ajustarCard(): void {
    const rect = this.alvoRect();
    const card = document.querySelector<HTMLElement>('.tour-card');

    if (!rect || !card) {
      return;
    }

    const margem = 14;
    const altura = card.offsetHeight;
    const largura = card.offsetWidth;
    const centroAlvo = rect.top + rect.height / 2;

    if (this.isMobile()) {
      const left = Math.min(
        Math.max(margem, rect.left + rect.width / 2 - largura / 2),
        Math.max(margem, window.innerWidth - largura - margem)
      );
      const espacoAcima = rect.top - margem;
      const espacoAbaixo = window.innerHeight - rect.bottom - margem;
      const precisaFicarAcima = espacoAcima >= altura + 18 || espacoAcima > espacoAbaixo;
      const top = precisaFicarAcima
        ? Math.max(margem, rect.top - altura - 18)
        : Math.min(rect.bottom + 18, window.innerHeight - altura - margem);

      this.cardTop.set(top);
      this.cardLeft.set(left);
      this.arrowTop.set(0);
      this.arrowLeft.set(false);
      return;
    }

    const topMaximo = Math.max(margem, window.innerHeight - altura - margem);
    const top = Math.min(Math.max(centroAlvo - altura / 2, margem), topMaximo);
    const seta = Math.min(Math.max(centroAlvo - top, 22), altura - 22);

    let left = rect.right + 22;
    let setaEsquerda = true;

    if (left + largura + margem > window.innerWidth) {
      left = Math.max(margem, rect.left - largura - 22);
      setaEsquerda = false;
    }

    this.cardTop.set(top);
    this.cardLeft.set(left);
    this.arrowTop.set(seta);
    this.arrowLeft.set(setaEsquerda);
  }

  private isMobile(): boolean {
    return window.matchMedia('(max-width: 760px)').matches;
  }

  private finalizar(): void {
    this.visivel.set(false);
    this.liberarScroll();

    try {
      const chave = this.getStorageKey();

      if (chave) {
        localStorage.setItem(chave, '1');
      }
    } catch {
      // Se o navegador bloquear o localStorage, o tour so deixa de persistir.
    }
  }

  private bloquearScroll(): void {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  private liberarScroll(): void {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  private jaViu(): boolean {
    try {
      const chave = this.getStorageKey();
      return !!chave && localStorage.getItem(chave) === '1';
    } catch {
      return false;
    }
  }

  private getStorageKey(): string | null {
    const usuario = this.authService.usuario();

    if (!usuario) {
      return null;
    }

    return `${STORAGE_KEY_PREFIX}.${usuario.id || usuario.email}`;
  }
}
