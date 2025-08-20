import {
  Component,
  Input,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  HostListener,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Settings2, ChevronRight } from 'lucide-angular';
import { CopilotChatToolbarButtonComponent } from './copilot-chat-buttons.component';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import type { ToolsMenuItem } from './copilot-chat-input.types';
import { cn } from '../../lib/utils';

@Component({
  selector: 'copilot-chat-tools-menu',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CopilotChatToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (hasItems()) {
      <div class="relative inline-block" #menuContainer>
        <button
          type="button"
          [disabled]="disabled()"
          [class]="buttonClass()"
          (click)="toggleMenu()"
        >
          <lucide-angular [img]="Settings2Icon" [size]="18"></lucide-angular>
          <span class="text-sm font-normal">{{ label() }}</span>
        </button>
        
        @if (isOpen()) {
          <div class="absolute bottom-full right-0 mb-2 z-50" [class.hidden]="!isOpen()">
            <div class="min-w-[200px] bg-white dark:bg-[#1F1F1F] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1">
              @for (item of toolsMenu(); track $index) {
                @if (item === '-') {
                  <div class="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                } @else if (isMenuItem(item) && item.items && item.items.length > 0) {
                  <div class="relative group" 
                       (mouseenter)="openSubmenu($index)"
                       (mouseleave)="closeSubmenu($index)">
                    <button 
                      type="button"
                      class="w-full px-3 py-2 text-left bg-transparent border-none rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-sm flex items-center justify-between"
                    >
                      {{ item.label }}
                      <lucide-angular [img]="ChevronRightIcon" [size]="12" class="ml-auto"></lucide-angular>
                    </button>
                    @if (isSubmenuOpen($index)) {
                      <div class="absolute left-full top-0 -ml-1 min-w-[200px] bg-white dark:bg-[#1F1F1F] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1"
                           style="padding-left: 8px;">
                        @for (subItem of item.items; track $index) {
                          @if (subItem === '-') {
                            <div class="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                          } @else if (isMenuItem(subItem)) {
                            <button 
                              type="button"
                              class="w-full px-3 py-2 text-left bg-transparent border-none rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-sm"
                              (click)="handleItemClick(subItem)"
                            >
                              {{ subItem.label }}
                            </button>
                          }
                        }
                      </div>
                    }
                  </div>
                } @else if (isMenuItem(item)) {
                  <button 
                    type="button"
                    class="w-full px-3 py-2 text-left bg-transparent border-none rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-sm"
                    (click)="handleItemClick(item)"
                  >
                    {{ item.label }}
                  </button>
                }
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [``]
})
export class CopilotChatToolsMenuComponent {
  @ViewChild('menuContainer', { read: ElementRef }) menuContainer?: ElementRef;
  
  readonly Settings2Icon = Settings2;
  readonly ChevronRightIcon = ChevronRight;
  
  @Input() set inputToolsMenu(val: (ToolsMenuItem | '-')[] | undefined) {
    this.toolsMenu.set(val || []);
  }
  @Input() set inputDisabled(val: boolean | undefined) {
    this.disabled.set(val || false);
  }
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  toolsMenu = signal<(ToolsMenuItem | '-')[]>([]);
  disabled = signal<boolean>(false);
  customClass = signal<string | undefined>(undefined);
  isOpen = signal<boolean>(false);
  openSubmenus = signal<Set<number>>(new Set());
  
  hasItems = computed(() => this.toolsMenu().length > 0);
  
  label = computed(() => {
    return this.chatConfig?.labels().chatInputToolbarToolsButtonLabel || 'Tools';
  });
  
  buttonClass = computed(() => {
    const baseClasses = cn(
      // Base button styles
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium',
      'transition-all disabled:pointer-events-none disabled:opacity-50',
      'shrink-0 outline-none',
      'focus-visible:ring-[3px]',
      // chatInputToolbarSecondary variant
      'cursor-pointer',
      'bg-transparent text-[#444444]',
      'dark:text-white dark:border-[#404040]',
      'transition-colors',
      'focus:outline-none',
      'hover:bg-[#f8f8f8] hover:text-[#333333]',
      'dark:hover:bg-[#404040] dark:hover:text-[#FFFFFF]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'disabled:hover:bg-transparent disabled:hover:text-[#444444]',
      'dark:disabled:hover:bg-transparent dark:disabled:hover:text-[#CCCCCC]',
      // Size
      'h-9 px-3 gap-2 font-normal'
    );
    return cn(baseClasses, this.customClass());
  });
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.menuContainer && !this.menuContainer.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
      this.openSubmenus.set(new Set());
    }
  }
  
  toggleMenu(): void {
    this.isOpen.update(v => !v);
    if (!this.isOpen()) {
      this.openSubmenus.set(new Set());
    }
  }
  
  isMenuItem(item: any): item is ToolsMenuItem {
    return item && typeof item === 'object' && 'label' in item;
  }
  
  handleItemClick(item: ToolsMenuItem): void {
    if (item.action) {
      item.action();
      this.isOpen.set(false);
      this.openSubmenus.set(new Set());
    }
  }
  
  openSubmenu(index: number): void {
    this.openSubmenus.update(set => {
      const newSet = new Set(set);
      newSet.add(index);
      return newSet;
    });
  }
  
  closeSubmenu(index: number): void {
    // Add a small delay to prevent menu from closing when moving to submenu
    setTimeout(() => {
      this.openSubmenus.update(set => {
        const newSet = new Set(set);
        newSet.delete(index);
        return newSet;
      });
    }, 200);
  }
  
  isSubmenuOpen(index: number): boolean {
    return this.openSubmenus().has(index);
  }
}