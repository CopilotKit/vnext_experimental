import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { CopilotKitConfigDirective } from "../copilotkit-config.directive";
import { CopilotKitService } from "../../core/copilotkit.service";
import { provideCopilotKit } from "../../core/copilotkit.providers";

// Mock CopilotKitCore to prevent network calls
vi.mock("@copilotkitnext/core", () => ({
  CopilotKitCore: vi.fn().mockImplementation(() => ({
    setRuntimeUrl: vi.fn(),
    setHeaders: vi.fn(),
    setProperties: vi.fn(),
    setAgents: vi.fn(),
    subscribe: vi.fn(() => () => {}), // Return unsubscribe function
  })),
}));

@Component({
  template: ` <div [copilotkitConfig]="config"></div> `,
  standalone: true,
  imports: [CopilotKitConfigDirective],
})
class TestComponent {
  config = {
    runtimeUrl: "https://api.test.com",
    headers: { "X-Test": "value" },
  };
}

describe("CopilotKitConfigDirective", () => {
  let service: CopilotKitService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent, CopilotKitConfigDirective],
      providers: [provideCopilotKit({})],
    }).compileComponents();

    service = TestBed.inject(CopilotKitService);
  });

  it("should update service when config changes", () => {
    const setRuntimeUrlSpy = vi.spyOn(service, "setRuntimeUrl");
    const setHeadersSpy = vi.spyOn(service, "setHeaders");

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    expect(setRuntimeUrlSpy).toHaveBeenCalledWith("https://api.test.com");
    expect(setHeadersSpy).toHaveBeenCalledWith({ "X-Test": "value" });
    expect(setRuntimeUrlSpy.mock.invocationCallOrder[0]).toBeGreaterThan(
      setHeadersSpy.mock.invocationCallOrder[0]
    );
  });

  it("should handle config updates", () => {
    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    const setRuntimeUrlSpy = vi.spyOn(service, "setRuntimeUrl");
    const setHeadersSpy = vi.spyOn(service, "setHeaders");

    // Update config
    fixture.componentInstance.config = {
      runtimeUrl: "https://api.updated.com",
      headers: { "X-Test": "updated" },
    };
    fixture.detectChanges();

    expect(setRuntimeUrlSpy).toHaveBeenCalledWith("https://api.updated.com");
    expect(setHeadersSpy).toHaveBeenCalledWith({ "X-Test": "updated" });
    expect(setRuntimeUrlSpy.mock.invocationCallOrder[0]).toBeGreaterThan(
      setHeadersSpy.mock.invocationCallOrder[0]
    );
  });
});
