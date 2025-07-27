import { routeRequest } from "../endpoint";
import { CopilotKitRequestType } from "../handler";
import { describe, it, expect } from "vitest";

describe("routeRequest", () => {
  // Helper function to create a Request object with a given URL
  const createRequest = (url: string): Request => {
    return new Request(url);
  };

  describe("RunAgent route pattern", () => {
    it("should match agent run URL with simple agent name", () => {
      const request = createRequest("https://example.com/agent/myAgent/run");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentId: "myAgent" });
    });

    it("should match agent run URL with alphanumeric agent name", () => {
      const request = createRequest("https://example.com/agent/agent123/run");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentId: "agent123" });
    });

    it("should match agent run URL with hyphenated agent name", () => {
      const request = createRequest("https://example.com/agent/my-agent/run");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentId: "my-agent" });
    });

    it("should match agent run URL with underscored agent name", () => {
      const request = createRequest("https://example.com/agent/my_agent/run");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentId: "my_agent" });
    });

    it("should match agent run URL with complex path prefix", () => {
      const request = createRequest(
        "https://example.com/api/v1/copilot/agent/testAgent/run"
      );
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentId: "testAgent" });
    });

    it("should not match agent run URL with empty agent name", () => {
      const request = createRequest("https://example.com/agent//run");
      const result = routeRequest(request);

      expect(result.requestType).toBe(null);
      expect(result.info).toBeUndefined();
    });

    it("should not match partial agent run URL", () => {
      const request = createRequest("https://example.com/agent/myAgent");
      const result = routeRequest(request);

      expect(result.requestType).toBe(null);
      expect(result.info).toBeUndefined();
    });

    it("should not match agent run URL with extra path segments", () => {
      const request = createRequest(
        "https://example.com/agent/myAgent/run/extra"
      );
      const result = routeRequest(request);

      expect(result.requestType).toBe(null);
      expect(result.info).toBeUndefined();
    });
  });

  describe("GetRuntimeInfo route pattern (/info endpoint)", () => {
    it("should match simple info URL", () => {
      const request = createRequest("https://example.com/info");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetRuntimeInfo);
      expect(result.info).toBeUndefined();
    });

    it("should match info URL with path prefix", () => {
      const request = createRequest("https://example.com/api/v1/copilot/info");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetRuntimeInfo);
      expect(result.info).toBeUndefined();
    });

    it("should match info URL with query parameters", () => {
      const request = createRequest("https://example.com/info?param=value");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetRuntimeInfo);
      expect(result.info).toBeUndefined();
    });

    it("should not match non-info URLs", () => {
      const request = createRequest("https://example.com/agents");
      const result = routeRequest(request);

      expect(result.requestType).toBe(null);
      expect(result.info).toBeUndefined();
    });
  });

  describe("Transcribe route pattern (/transcribe endpoint)", () => {
    it("should match simple transcribe URL", () => {
      const request = createRequest("https://example.com/transcribe");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.Transcribe);
      expect(result.info).toBeUndefined();
    });

    it("should match transcribe URL with path prefix", () => {
      const request = createRequest(
        "https://example.com/api/v1/copilot/transcribe"
      );
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.Transcribe);
      expect(result.info).toBeUndefined();
    });

    it("should match transcribe URL with query parameters", () => {
      const request = createRequest(
        "https://example.com/transcribe?format=json"
      );
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.Transcribe);
      expect(result.info).toBeUndefined();
    });

    it("should not match transcribe URLs with extra path segments", () => {
      const request = createRequest("https://example.com/transcribe/extra");
      const result = routeRequest(request);

      expect(result.requestType).toBe(null);
      expect(result.info).toBeUndefined();
    });
  });

  describe("Unmatched routes (404 behavior)", () => {
    it("should return null for root path", () => {
      const request = createRequest("https://example.com/");
      const result = routeRequest(request);

      expect(result.requestType).toBe(null);
      expect(result.info).toBeUndefined();
    });

    it("should return null for unknown paths", () => {
      const request = createRequest("https://example.com/unknown/path");
      const result = routeRequest(request);

      expect(result.requestType).toBe(null);
      expect(result.info).toBeUndefined();
    });

    it("should return null for malformed agent paths", () => {
      const request = createRequest("https://example.com/agent/run");
      const result = routeRequest(request);

      expect(result.requestType).toBe(null);
      expect(result.info).toBeUndefined();
    });

    it("should return null for agents path", () => {
      const request = createRequest("https://example.com/agents");
      const result = routeRequest(request);

      expect(result.requestType).toBe(null);
      expect(result.info).toBeUndefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle URLs with different domains", () => {
      const request = createRequest("http://localhost:3000/agent/test/run");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentId: "test" });
    });

    it("should handle URLs with ports for info endpoint", () => {
      const request = createRequest("https://api.example.com:8080/info");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetRuntimeInfo);
      expect(result.info).toBeUndefined();
    });

    it("should handle URLs with ports for transcribe endpoint", () => {
      const request = createRequest("https://api.example.com:8080/transcribe");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.Transcribe);
      expect(result.info).toBeUndefined();
    });

    it("should handle URLs with hash fragments", () => {
      const request = createRequest(
        "https://example.com/agent/myAgent/run#section"
      );
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentId: "myAgent" });
    });

    it("should handle URLs with special characters in agent names", () => {
      const request = createRequest(
        "https://example.com/agent/test%20agent/run"
      );
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentId: "test%20agent" });
    });
  });
});
