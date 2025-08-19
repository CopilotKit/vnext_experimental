import {
  Component,
  Input,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotChatToolbarButtonComponent } from './copilot-chat-buttons.component';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import type { ToolsMenuItem } from './copilot-chat-input.types';

@Component({
  selector: 'copilot-chat-tools-menu',
  standalone: true,
  imports: [CommonModule, CopilotChatToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasItems()) {
      <div class="tools-menu-container" #menuContainer>
        <button
          type="button"
          [disabled]="disabled()"
          [class]="buttonClass()"
          (click)="toggleMenu()"
        >
          <!-- Settings Icon -->
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6"></path>
            <path d="M12 17v6"></path>
            <path d="M4.22 4.22l4.24 4.24"></path>
            <path d="M15.54 15.54l4.24 4.24"></path>
            <path d="M1 12h6"></path>
            <path d="M17 12h6"></path>
            <path d="M4.22 19.78l4.24-4.24"></path>
            <path d="M15.54 8.46l4.24-4.24"></path>
          </svg>
          <span class="button-label">{{ label() }}</span>
        </button>
        
        @if (isOpen()) {
          <div class="dropdown-menu" [class.show]="isOpen()">
            <div class="dropdown-content">
              @for (item of toolsMenu(); track $index) {
                @if (item === '-') {
                  <div class="dropdown-separator"></div>
                } @else if (isMenuItem(item) && item.items && item.items.length > 0) {
                  <div class="dropdown-submenu">
                    <button 
                      type="button"
                      class="dropdown-item submenu-trigger"
                      (mouseenter)="openSubmenu($index)"
                      (mouseleave)="closeSubmenu($index)"
                    >
                      {{ item.label }}
                      <svg class="submenu-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                    @if (isSubmenuOpen($index)) {
                      <div class="dropdown-submenu-content">
                        @for (subItem of item.items; track $index) {
                          @if (subItem === '-') {
                            <div class="dropdown-separator"></div>
                          } @else if (isMenuItem(subItem)) {
                            <button 
                              type="button"
                              class="dropdown-item"
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
                    class="dropdown-item"
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
  styles: [`
    .tools-menu-container {
      position: relative;
      display: inline-block;
    }
    
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      background: transparent;
      color: rgb(93, 93, 93);
      border: none;
      cursor: pointer;
      transition: all 150ms;
      font-size: 14px;
      font-weight: normal;
    }
    
    button:hover:not(:disabled) {
      background: #E8E8E8;
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    :host-context(.dark) button {
      color: rgb(243, 243, 243);
    }
    
    :host-context(.dark) button:hover:not(:disabled) {
      background: #303030;
    }
    
    .button-label {
      margin-left: 0.25rem;
    }
    
    .dropdown-menu {
      position: absolute;
      bottom: 100%;
      right: 0;
      margin-bottom: 0.5rem;
      z-index: 1000;
      display: none;
    }
    
    .dropdown-menu.show {
      display: block;
    }
    
    .dropdown-content {
      min-width: 200px;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      padding: 0.25rem;
    }
    
    :host-context(.dark) .dropdown-content {
      background: #1F1F1F;
      border-color: rgba(255, 255, 255, 0.1);
    }
    
    .dropdown-item {
      width: 100%;
      padding: 0.5rem 0.75rem;
      text-align: left;
      background: none;
      border: none;
      border-radius: 4px;
      color: inherit;
      cursor: pointer;
      transition: background 150ms;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .dropdown-item:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    
    :host-context(.dark) .dropdown-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .dropdown-separator {
      height: 1px;
      background: rgba(0, 0, 0, 0.1);
      margin: 0.25rem 0;
    }
    
    :host-context(.dark) .dropdown-separator {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .dropdown-submenu {
      position: relative;
    }
    
    .submenu-trigger {
      position: relative;
    }
    
    .submenu-arrow {
      margin-left: auto;
    }
    
    .dropdown-submenu-content {
      position: absolute;
      left: 100%;
      top: 0;
      margin-left: 0.25rem;
      min-width: 200px;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      padding: 0.25rem;
    }
    
    :host-context(.dark) .dropdown-submenu-content {
      background: #1F1F1F;
      border-color: rgba(255, 255, 255, 0.1);
    }
  `],
  host: {
    '[class.copilot-chat-tools-menu]': 'true'
  }
})
export class CopilotChatToolsMenuComponent {
  @ViewChild('menuContainer', { read: ElementRef }) menuContainer?: ElementRef;
  
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
    const baseClasses = 'tools-button';
    return this.customClass() || baseClasses;
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
    }, 100);
  }
  
  isSubmenuOpen(index: number): boolean {
    return this.openSubmenus().has(index);
  }
}