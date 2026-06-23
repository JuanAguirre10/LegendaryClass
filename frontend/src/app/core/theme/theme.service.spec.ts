import { TestBed } from '@angular/core/testing';
import { ThemeService, ThemeMode } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  it('should default to system mode when no localStorage entry', () => {
    expect(service.mode()).toBe('system');
  });

  it('setMode should persist to localStorage', () => {
    service.setMode('dark');
    expect(service.mode()).toBe('dark');
    expect(localStorage.getItem('lc-theme')).toBe('dark');
  });

  it('cycleMode: system → dark → light → system', () => {
    service.setMode('system');
    service.cycleMode();
    expect(service.mode()).toBe('dark');
    service.cycleMode();
    expect(service.mode()).toBe('light');
    service.cycleMode();
    expect(service.mode()).toBe('system');
  });

  it('isDark is true when mode is dark', () => {
    service.setMode('dark');
    expect(service.isDark()).toBe(true);
  });

  it('isDark is false when mode is light', () => {
    service.setMode('light');
    expect(service.isDark()).toBe(false);
  });
});
