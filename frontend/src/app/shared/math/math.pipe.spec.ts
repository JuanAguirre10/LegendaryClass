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

  it('returns empty string for null input', () => {
    expect(pipe.transform(null) as string).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(pipe.transform('') as string).toBe('');
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
});
