import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  signal,
  computed,
  OnInit,
  OnChanges,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { CdkScrollable, ScrollingModule } from '@angular/cdk/scrolling';
import { CopilotSlotComponent } from '../../lib/slots/copilot-slot.component';
import { CopilotChatMessageViewComponent } from './copilot-chat-message-view.component';
import { CopilotChatViewScrollToBottomButtonComponent } from './copilot-chat-view-scroll-to-bottom-button.component';
import { StickToBottomDirective } from '../../directives/stick-to-bottom.directive';
import { ScrollPositionService } from '../../services/scroll-position.service';
import { Message } from '@ag-ui/client';
import { cn } from '../../lib/utils';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * ScrollView component for CopilotChatView
 * Handles auto-scrolling and scroll position management
 */
@Component({
  selector: 'copilot-chat-view-scroll-view',
  standalone: true,
  imports: [
    CommonModule,
    ScrollingModule,
    CopilotSlotComponent,
    CopilotChatMessageViewComponent,
    CopilotChatViewScrollToBottomButtonComponent,
    StickToBottomDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [ScrollPositionService],
  template: `
    @if (!hasMounted()) {
      <!-- SSR/Initial render without stick-to-bottom -->
      <div class="h-full max-h-full flex flex-col min-h-0 overflow-y-scroll overflow-x-hidden">
        <div class="px-4 sm:px-0">
          <ng-content></ng-content>
        </div>
      </div>
    } @else if (!autoScroll) {
      <!-- Manual scroll mode -->
      <div class="h-full max-h-full flex flex-col min-h-0 relative">
        <div 
          #scrollContainer
          cdkScrollable
          [class]="computedClass()"
          class="overflow-y-scroll overflow-x-hidden">
          <div #contentContainer class="px-4 sm:px-0">
            <!-- Content with padding-bottom matching React -->
            <div [style.padding-bottom.px]="paddingBottom()">
              <div class="max-w-3xl mx-auto">
                <copilot-slot
                  [slot]="messageView"
                  [context]="{ messages }"
                  [props]="messageViewProps"
                  [defaultComponent]="defaultMessageViewComponent">
                </copilot-slot>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Scroll to bottom button for manual mode, OUTSIDE scrollable content -->
        @if (showScrollButton() && !isResizing) {
          <div
            class="absolute inset-x-0 flex justify-center z-10"
            [style.bottom.px]="inputContainerHeightSignal() + 16">
            <copilot-slot
              [slot]="scrollToBottomButton"
              [context]="{ onClick: scrollToBottom.bind(this) }"
              [props]="scrollToBottomButtonProps"
              [defaultComponent]="defaultScrollToBottomButtonComponent">
            </copilot-slot>
          </div>
        }
      </div>
    } @else {
      <!-- Auto-scroll mode with StickToBottom directive -->
      <div class="h-full max-h-full flex flex-col min-h-0 relative">
        <div 
          #scrollContainer
          cdkScrollable
          copilotStickToBottom
          [enabled]="autoScroll"
          [threshold]="10"
          [initialBehavior]="'smooth'"
          [resizeBehavior]="'smooth'"
          (isAtBottomChange)="onIsAtBottomChange($event)"
          [class]="computedClass()"
          class="overflow-y-scroll overflow-x-hidden">
          
          <!-- Scrollable content wrapper -->
          <div class="px-4 sm:px-0">
            <!-- Content with padding-bottom matching React -->
            <div [style.padding-bottom.px]="paddingBottom()">
              <div class="max-w-3xl mx-auto">
                <copilot-slot
                  [slot]="messageView"
                  [context]="{ messages }"
                  [props]="messageViewProps"
                  [defaultComponent]="defaultMessageViewComponent">
                </copilot-slot>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Scroll to bottom button - hidden during resize, OUTSIDE scrollable content -->
        @if (!isAtBottom() && !isResizing) {
          <div
            class="absolute inset-x-0 flex justify-center z-10"
            [style.bottom.px]="inputContainerHeightSignal() + 16">
            <copilot-slot
              [slot]="scrollToBottomButton"
              [context]="{ onClick: scrollToBottomFromStick.bind(this) }"
              [props]="scrollToBottomButtonProps"
              [defaultComponent]="defaultScrollToBottomButtonComponent">
            </copilot-slot>
          </div>
        }
      </div>
    }
  `
})
export class CopilotChatViewScrollViewComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  
  @Input() autoScroll: boolean = true;
  
  private _inputContainerHeight: number = 0;
  @Input() 
  set inputContainerHeight(value: number) {
    this._inputContainerHeight = value;
    this.inputContainerHeightSignal.set(value);
    this.cdr.markForCheck();
  }
  get inputContainerHeight(): number {
    return this._inputContainerHeight;
  }
  
  @Input() isResizing: boolean = false;
  @Input() inputClass?: string;
  @Input() messages: Message[] = [];
  @Input() messageView?: any;
  @Input() messageViewProps?: any;
  
  // Slot inputs
  @Input() scrollToBottomButton?: any;
  @Input() scrollToBottomButtonProps?: any;
  
  // ViewChild references
  @ViewChild('scrollContainer', { read: ElementRef }) scrollContainer?: ElementRef<HTMLElement>;
  @ViewChild('contentContainer', { read: ElementRef }) contentContainer?: ElementRef<HTMLElement>;
  @ViewChild(StickToBottomDirective) stickToBottomDirective?: StickToBottomDirective;
  
  // Default components
  protected readonly defaultMessageViewComponent = CopilotChatMessageViewComponent;
  protected readonly defaultScrollToBottomButtonComponent = CopilotChatViewScrollToBottomButtonComponent;
  
  // Signals
  protected hasMounted = signal(false);
  protected showScrollButton = signal(false);
  protected isAtBottom = signal(true);
  protected inputContainerHeightSignal = signal(0);
  protected paddingBottom = computed(() => this.inputContainerHeightSignal() + 32);
  
  // Computed class
  protected computedClass = computed(() => 
    cn(this.inputClass)
  );
  
  private destroy$ = new Subject<void>();
  private platformId = inject(PLATFORM_ID);
  private scrollPositionService = inject(ScrollPositionService);
  
  ngOnInit(): void {
    // Check if we're in the browser
    if (isPlatformBrowser(this.platformId)) {
      // Set mounted after a tick to allow for hydration
      setTimeout(() => {
        this.hasMounted.set(true);
      }, 0);
    }
  }
  
  ngOnChanges(): void {
    // Update signals when inputs change
    // Force change detection when inputContainerHeight changes
    if (this.inputContainerHeight !== undefined) {
      this.cdr.detectChanges();
    }
  }
  
  ngAfterViewInit(): void {
    if (!this.autoScroll && this.scrollContainer) {
      // Monitor scroll position for manual mode
      this.scrollPositionService.monitorScrollPosition(this.scrollContainer, 10)
        .pipe(takeUntil(this.destroy$))
        .subscribe(state => {
          this.showScrollButton.set(!state.isAtBottom);
        });
    }
  }
  
  /**
   * Handle isAtBottom change from StickToBottom directive
   */
  onIsAtBottomChange(isAtBottom: boolean): void {
    this.isAtBottom.set(isAtBottom);
  }
  
  /**
   * Scroll to bottom for manual mode
   */
  scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollPositionService.scrollToBottom(this.scrollContainer, true);
    }
  }
  
  /**
   * Scroll to bottom for stick-to-bottom mode
   */
  scrollToBottomFromStick(): void {
    if (this.stickToBottomDirective) {
      this.stickToBottomDirective.scrollToBottom('smooth');
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}