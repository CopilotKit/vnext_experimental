import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { cn } from "../../lib/utils";

@Component({
  selector: "div[copilotChatToolbar]",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    "[class]": "computedClass()",
  },
  template: `<ng-content></ng-content>`,
  styles: [],
})
export class CopilotChatToolbar {
  inputClass = input<string | undefined>();

  computedClass = computed(() => {
    const baseClasses =
      "w-full h-[60px] bg-transparent flex items-center justify-between";
    return cn(baseClasses, this.inputClass());
  });
}
