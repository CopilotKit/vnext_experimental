import { routeRequest } from "../endpoint";
import { CopilotKitRequestType } from "../handler";

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
      expect(result.info).toEqual({ agentName: "myAgent" });
    });

    it("should match agent run URL with alphanumeric agent name", () => {
      const request = createRequest("https://example.com/agent/agent123/run");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentName: "agent123" });
    });

    it("should match agent run URL with hyphenated agent name", () => {
      const request = createRequest("https://example.com/agent/my-agent/run");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentName: "my-agent" });
    });

    it("should match agent run URL with underscored agent name", () => {
      const request = createRequest("https://example.com/agent/my_agent/run");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentName: "my_agent" });
    });

    it("should match agent run URL with complex path prefix", () => {
      const request = createRequest(
        "https://example.com/api/v1/copilot/agent/testAgent/run"
      );
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentName: "testAgent" });
    });

    it("should not match agent run URL with empty agent name", () => {
      const request = createRequest("https://example.com/agent//run");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetInfo);
      expect(result.info).toBeUndefined();
    });

    it("should not match partial agent run URL", () => {
      const request = createRequest("https://example.com/agent/myAgent");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetInfo);
      expect(result.info).toBeUndefined();
    });

    it("should not match agent run URL with extra path segments", () => {
      const request = createRequest(
        "https://example.com/agent/myAgent/run/extra"
      );
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetInfo);
      expect(result.info).toBeUndefined();
    });
  });

  describe("GetAgents route pattern", () => {
    it("should match simple agents URL", () => {
      const request = createRequest("https://example.com/agents");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetAgents);
      expect(result.info).toBeUndefined();
    });

    it("should match agents URL with path prefix", () => {
      const request = createRequest(
        "https://example.com/api/v1/copilot/agents"
      );
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetAgents);
      expect(result.info).toBeUndefined();
    });

    it("should match agents URL with query parameters", () => {
      const request = createRequest("https://example.com/agents?filter=active");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetAgents);
      expect(result.info).toBeUndefined();
    });

    it("should not match agents URL with extra path segments", () => {
      const request = createRequest("https://example.com/agents/123");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetInfo);
      expect(result.info).toBeUndefined();
    });
  });

  describe("GetInfo route pattern (default)", () => {
    it("should default to GetInfo for root path", () => {
      const request = createRequest("https://example.com/");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetInfo);
      expect(result.info).toBeUndefined();
    });

    it("should default to GetInfo for info path", () => {
      const request = createRequest("https://example.com/info");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetInfo);
      expect(result.info).toBeUndefined();
    });

    it("should default to GetInfo for unknown paths", () => {
      const request = createRequest("https://example.com/unknown/path");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetInfo);
      expect(result.info).toBeUndefined();
    });

    it("should default to GetInfo for malformed agent paths", () => {
      const request = createRequest("https://example.com/agent/run");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetInfo);
      expect(result.info).toBeUndefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle URLs with different domains", () => {
      const request = createRequest("http://localhost:3000/agent/test/run");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentName: "test" });
    });

    it("should handle URLs with ports", () => {
      const request = createRequest("https://api.example.com:8080/agents");
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.GetAgents);
      expect(result.info).toBeUndefined();
    });

    it("should handle URLs with hash fragments", () => {
      const request = createRequest(
        "https://example.com/agent/myAgent/run#section"
      );
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentName: "myAgent" });
    });

    it("should handle URLs with special characters in agent names", () => {
      const request = createRequest(
        "https://example.com/agent/test%20agent/run"
      );
      const result = routeRequest(request);

      expect(result.requestType).toBe(CopilotKitRequestType.RunAgent);
      expect(result.info).toEqual({ agentName: "test%20agent" });
    });
  });
});
