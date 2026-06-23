import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { MathPipe } from './math.pipe';

describe('MathPipe', () => {
  let pipe: MathPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [] });
    const sanitizer = TestBed.inject(DomSanitizer);
    pipe = new MathPipe(sanitizer);
  });

  it('returns SafeHtml with empty content for null input', () => {
    const result = pipe.transform(null) as any;
    const html: string = result?.changingThisBreaksApplicationSecurity ?? String(result);
    expect(html).toBe('');
  });

  it('returns SafeHtml with empty content for empty string', () => {
    const result = pipe.transform('') as any;
    const html: string = result?.changingThisBreaksApplicationSecurity ?? String(result);
    expect(html).toBe('');
  });

  it('renders inline math $x^2$ as katex HTML', () => {
    const result = pipe.transform('Calcula $x^2$') as any;
    const html: string = result?.changingThisBreaksApplicationSecurity ?? String(result);
    expect(html).toContain('katex');
    expect(html).toContain('x');
  });

  it('renders display math $$a+b$$ with displayMode', () => {
    const result = pipe.transform('$$a+b=c$$') as any;
    const html: string = result?.changingThisBreaksApplicationSecurity ?? String(result);
    expect(html).toContain('katex-display');
  });

  it('passes through plain text without LaTeX unchanged', () => {
    const result = pipe.transform('Texto sin fórmulas') as any;
    const html: string = result?.changingThisBreaksApplicationSecurity ?? String(result);
    expect(html).toBe('Texto sin fórmulas');
  });

  it('renders escaped dollar inside math delimiters: $\\$250$ produces KaTeX output', () => {
    const result = pipe.transform('Price: $\\$250$') as any;
    const html: string = result?.changingThisBreaksApplicationSecurity ?? String(result);
    // KaTeX should have rendered the expression; check for KaTeX markup and the digits
    expect(html).toContain('katex');
    expect(html).toContain('250');
  });

  it('restores escaped dollar outside math delimiters as literal $', () => {
    const result = pipe.transform('Cost is \\$50 today') as any;
    const html: string = result?.changingThisBreaksApplicationSecurity ?? String(result);
    expect(html).toContain('$50');
  });
});
