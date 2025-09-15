import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { CopilotKitConfig } from "../copilotkit-config";
import { CopilotKit } from "../../core/copilotkit";
import { provideCopilotKit } from "../../core/copilotkit.providers";

// Mock CopilotKitCore to prevent network calls
jest.mock("@copilotkitnext/core", () => ({
  CopilotKitCore: vi.fn().mockImplementation(() => ({
    setRuntimeUrl: vi.fn(),
    setHeaders: vi.fn(),
    setProperties: vi.fn(),
    setAgents: vi.fn(),
    subscribe: vi.fn(() => () => {}), // Return unsubscribe function
  })),
}));

@Component({
  standalone: true,
template: ` <div [copilotkitConfig]="config"></div> `,
  imports: [CopilotKitConfig],
})
class TestComponent {
  config = {
    runtimeUrl: "https://api.test.com",
    headers: { "X-Test": "value" },
  };
}

describe("CopilotKitConfig", () => {
  let service: CopilotKit;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent, CopilotKitConfig],
      providers: [provideCopilotKit({})],
    }).compileComponents();

    service = TestBed.inject(CopilotKit);
  });

  it("should update service when config changes", () => {
    const setRuntimeUrlSpy = vi.spyOn(service, "setRuntimeUrl");
    const setHeadersSpy = vi.spyOn(service, "setHeaders");

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    expect(setRuntimeUrlSpy).toHaveBeenCalledWith("https://api.test.com");
    expect(setHeadersSpy).toHaveBeenCalledWith({ "X-Test": "value" });
  });

  it("should handle config updates", () => {
    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    const setRuntimeUrlSpy = vi.spyOn(service, "setRuntimeUrl");

    // Update config
    fixture.componentInstance.config = {
      runtimeUrl: "https://api.updated.com",
      headers: { "X-Test": "updated" },
    };
    fixture.detectChanges();

    expect(setRuntimeUrlSpy).toHaveBeenCalledWith("https://api.updated.com");
  });
});
