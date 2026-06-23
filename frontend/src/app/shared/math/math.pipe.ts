import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import katex from 'katex';

@Pipe({ name: 'math', standalone: true, pure: true })
export class MathPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    let result = value.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) =>
      katex.renderToString(expr.trim(), { throwOnError: false, displayMode: true, output: 'html' })
    );
    result = result.replace(/\$([^$\n]+?)\$/g, (_, expr) =>
      katex.renderToString(expr.trim(), { throwOnError: false, displayMode: false, output: 'html' })
    );
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }
}
