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
  selector: "div[copilotChatUserMessageToolbar]",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: ` <ng-content></ng-content> `,
  host: {
    "[class]": "computedClass()",
  },
})
export class CopilotChatUserMessageToolbar {
  inputClass = input<string | undefined>();

  computedClass = computed(() =>
    cn(
      "w-full bg-transparent flex items-center justify-end mt-[4px] invisible group-hover:visible",
      this.inputClass()
    )
  );
}
