import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import katex from 'katex';

@Pipe({ name: 'math', standalone: true, pure: true })
export class MathPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return this.sanitizer.bypassSecurityTrustHtml('');

    const DOLLAR = '\x00KDOLLAR\x00';
    // Temporarily hide escaped dollars so the regex won't treat them as delimiters
    let result = value.replace(/\\\$/g, DOLLAR);

    result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) =>
      katex.renderToString(expr.trim().replace(/\x00KDOLLAR\x00/g, '\\$'), {
        throwOnError: false, displayMode: true, output: 'html',
      })
    );
    result = result.replace(/\$([^$\n]+?)\$/g, (_, expr) =>
      katex.renderToString(expr.trim().replace(/\x00KDOLLAR\x00/g, '\\$'), {
        throwOnError: false, displayMode: false, output: 'html',
      })
    );
    // Restore any escaped dollars that were outside math delimiters as literal $
    result = result.replace(/\x00KDOLLAR\x00/g, '$');

    return this.sanitizer.bypassSecurityTrustHtml(result);
  }
}
