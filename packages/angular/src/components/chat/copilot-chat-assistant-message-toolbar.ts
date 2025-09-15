import { Directive, input, computed } from "@angular/core";
import { cn } from "../../lib/utils";

@Directive({
  standalone: true,
  selector: "[copilotChatAssistantMessageToolbar]",
  host: {
    "[class]": "computedClass()",
  },
})
export class CopilotChatAssistantMessageToolbar {
  inputClass = input<string | undefined>();

  computedClass = computed(() => {
    return cn(
      "w-full bg-transparent flex items-center -ml-[5px] -mt-[0px]",
      this.inputClass()
    );
  });
}
