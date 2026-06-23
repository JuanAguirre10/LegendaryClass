import { Component, Input, OnChanges, ElementRef, ViewChild } from '@angular/core';
import katex from 'katex';

@Component({
  selector: 'app-math',
  standalone: true,
  template: `<span #container></span>`,
})
export class MathComponent implements OnChanges {
  @Input() expr = '';
  @Input() display = false;
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLSpanElement>;

  ngOnChanges(): void {
    try {
      this.container.nativeElement.innerHTML = katex.renderToString(this.expr, {
        throwOnError: false,
        displayMode: this.display,
        output: 'html',
      });
    } catch {
      this.container.nativeElement.textContent = this.expr;
    }
  }
}
