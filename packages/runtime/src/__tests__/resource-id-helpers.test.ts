import { describe, expect, it } from "vitest";
import {
  validateResourceIdMatch,
  filterAuthorizedResourceIds,
  createStrictThreadScopeResolver,
  createFilteringThreadScopeResolver,
} from "../resource-id-helpers";

describe("validateResourceIdMatch", () => {
  describe("basic validation", () => {
    it("should pass when client-declared matches server-authorized (both strings)", () => {
      expect(() => {
        validateResourceIdMatch("user-123", "user-123");
      }).not.toThrow();
    });

    it("should pass when clientDeclared is undefined (no client hint)", () => {
      expect(() => {
        validateResourceIdMatch(undefined, "user-123");
      }).not.toThrow();
    });

    it("should throw when client-declared does not match server-authorized", () => {
      expect(() => {
        validateResourceIdMatch("user-999", "user-123");
      }).toThrow("Unauthorized: Client-declared resourceId does not match authenticated user");
    });

    it("should pass when client-declared string matches one in server-authorized array", () => {
      expect(() => {
        validateResourceIdMatch("workspace-2", ["workspace-1", "workspace-2", "workspace-3"]);
      }).not.toThrow();
    });

    it("should pass when one client-declared in array matches server-authorized string", () => {
      expect(() => {
        validateResourceIdMatch(["user-1", "user-123", "user-3"], "user-123");
      }).not.toThrow();
    });

    it("should pass when at least one client-declared matches one server-authorized (both arrays)", () => {
      expect(() => {
        validateResourceIdMatch(
          ["user-1", "workspace-2"],
          ["workspace-1", "workspace-2", "workspace-3"]
        );
      }).not.toThrow();
    });

    it("should throw when no client-declared matches any server-authorized (both arrays)", () => {
      expect(() => {
        validateResourceIdMatch(["user-1", "user-2"], ["workspace-1", "workspace-2"]);
      }).toThrow("Unauthorized: Client-declared resourceId does not match authenticated user");
    });
  });

  describe("edge cases", () => {
    it("should handle empty array in clientDeclared (fails)", () => {
      expect(() => {
        validateResourceIdMatch([], "user-123");
      }).toThrow("Unauthorized: Client-declared resourceId does not match authenticated user");
    });

    it("should handle empty array in serverAuthorized (always fails)", () => {
      expect(() => {
        validateResourceIdMatch("user-123", []);
      }).toThrow("Unauthorized: Client-declared resourceId does not match authenticated user");
    });

    it("should handle special characters", () => {
      const specialId = "user@example.com/workspace#123";
      expect(() => {
        validateResourceIdMatch(specialId, specialId);
      }).not.toThrow();
    });

    it("should handle Unicode characters", () => {
      const unicodeId = "用户-123-مستخدم";
      expect(() => {
        validateResourceIdMatch(unicodeId, unicodeId);
      }).not.toThrow();
    });

    it("should handle very long IDs", () => {
      const longId = "user-" + "a".repeat(1000);
      expect(() => {
        validateResourceIdMatch(longId, longId);
      }).not.toThrow();
    });

    it("should handle whitespace-only IDs", () => {
      expect(() => {
        validateResourceIdMatch("   ", "   ");
      }).not.toThrow();
    });

    it("should be case-sensitive", () => {
      expect(() => {
        validateResourceIdMatch("User-123", "user-123");
      }).toThrow();
    });

    it("should not trim whitespace", () => {
      expect(() => {
        validateResourceIdMatch("user-123 ", "user-123");
      }).toThrow();
    });

    it("should handle duplicate IDs in arrays", () => {
      expect(() => {
        validateResourceIdMatch(
          ["user-1", "user-1", "user-2"],
          ["user-1", "workspace-1"]
        );
      }).not.toThrow();
    });
  });

  describe("multiple matches", () => {
    it("should pass if ANY client ID matches ANY server ID", () => {
      expect(() => {
        validateResourceIdMatch(
          ["wrong-1", "wrong-2", "correct", "wrong-3"],
          ["other-1", "other-2", "correct", "other-3"]
        );
      }).not.toThrow();
    });

    it("should pass with multiple matching IDs", () => {
      expect(() => {
        validateResourceIdMatch(
          ["match-1", "match-2", "no-match"],
          ["match-1", "match-2", "other"]
        );
      }).not.toThrow();
    });
  });
});

describe("filterAuthorizedResourceIds", () => {
  describe("basic filtering", () => {
    it("should return all authorized when clientDeclared is undefined", () => {
      const result = filterAuthorizedResourceIds(undefined, "user-123");
      expect(result).toBe("user-123");
    });

    it("should return all authorized array when clientDeclared is undefined", () => {
      const result = filterAuthorizedResourceIds(undefined, ["user-1", "workspace-1"]);
      expect(result).toEqual(["user-1", "workspace-1"]);
    });

    it("should return single ID when both match (strings)", () => {
      const result = filterAuthorizedResourceIds("user-123", "user-123");
      expect(result).toBe("user-123");
    });

    it("should throw when single ID does not match", () => {
      expect(() => {
        filterAuthorizedResourceIds("user-999", "user-123");
      }).toThrow("Unauthorized: None of the client-declared resourceIds are authorized");
    });

    it("should filter array to only authorized IDs", () => {
      const result = filterAuthorizedResourceIds(
        ["workspace-1", "workspace-2", "workspace-5"],
        ["workspace-1", "workspace-2", "workspace-3", "workspace-4"]
      );
      expect(result).toEqual(["workspace-1", "workspace-2"]);
    });

    it("should return single string when client is string and matches", () => {
      const result = filterAuthorizedResourceIds(
        "workspace-2",
        ["workspace-1", "workspace-2", "workspace-3"]
      );
      expect(result).toBe("workspace-2");
    });

    it("should throw when client string does not match any authorized", () => {
      expect(() => {
        filterAuthorizedResourceIds(
          "workspace-999",
          ["workspace-1", "workspace-2", "workspace-3"]
        );
      }).toThrow("Unauthorized: None of the client-declared resourceIds are authorized");
    });

    it("should throw when no client IDs match authorized", () => {
      expect(() => {
        filterAuthorizedResourceIds(
          ["wrong-1", "wrong-2"],
          ["workspace-1", "workspace-2"]
        );
      }).toThrow("Unauthorized: None of the client-declared resourceIds are authorized");
    });
  });

  describe("return type preservation", () => {
    it("should return string when client is string and matches", () => {
      const result = filterAuthorizedResourceIds("user-1", ["user-1", "user-2"]);
      expect(result).toBe("user-1");
      expect(typeof result).toBe("string");
    });

    it("should return array when client is array", () => {
      const result = filterAuthorizedResourceIds(
        ["user-1", "user-2"],
        ["user-1", "user-2", "user-3"]
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(["user-1", "user-2"]);
    });

    it("should return single-element array when client is array with one match", () => {
      const result = filterAuthorizedResourceIds(
        ["user-1", "wrong-1", "wrong-2"],
        ["user-1", "user-2"]
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(["user-1"]);
    });
  });

  describe("edge cases", () => {
    it("should handle empty client array (throws)", () => {
      expect(() => {
        filterAuthorizedResourceIds([], ["user-1", "user-2"]);
      }).toThrow("Unauthorized: None of the client-declared resourceIds are authorized");
    });

    it("should handle empty authorized array (throws)", () => {
      expect(() => {
        filterAuthorizedResourceIds(["user-1"], []);
      }).toThrow("Unauthorized: None of the client-declared resourceIds are authorized");
    });

    it("should handle duplicate IDs in client array", () => {
      const result = filterAuthorizedResourceIds(
        ["user-1", "user-1", "user-2"],
        ["user-1", "user-2", "user-3"]
      );
      // Should preserve duplicates
      expect(result).toEqual(["user-1", "user-1", "user-2"]);
    });

    it("should handle duplicate IDs in authorized array", () => {
      const result = filterAuthorizedResourceIds(
        ["user-1"],
        ["user-1", "user-1", "user-2"]
      );
      // Client passed array, so result is array
      expect(result).toEqual(["user-1"]);
    });

    it("should handle special characters", () => {
      const specialId = "user@example.com/workspace#123";
      const result = filterAuthorizedResourceIds(specialId, [specialId, "other"]);
      expect(result).toBe(specialId);
    });

    it("should handle Unicode characters", () => {
      const unicodeId = "用户-123";
      const result = filterAuthorizedResourceIds([unicodeId, "other"], [unicodeId]);
      expect(result).toEqual([unicodeId]);
    });

    it("should be case-sensitive", () => {
      expect(() => {
        filterAuthorizedResourceIds("User-123", ["user-123"]);
      }).toThrow();
    });

    it("should not trim whitespace", () => {
      expect(() => {
        filterAuthorizedResourceIds("user-123 ", ["user-123"]);
      }).toThrow();
    });

    it("should handle whitespace-only IDs", () => {
      const result = filterAuthorizedResourceIds("   ", ["   ", "other"]);
      expect(result).toBe("   ");
    });

    it("should preserve order of filtered IDs", () => {
      const result = filterAuthorizedResourceIds(
        ["z", "a", "m", "b"],
        ["m", "a", "z", "b"]
      );
      // Should preserve client order, not server order
      expect(result).toEqual(["z", "a", "m", "b"]);
    });
  });
});

describe("createStrictThreadScopeResolver", () => {
  const createRequest = () => new Request("https://example.com/api");

  describe("basic functionality", () => {
    it("should create extractor that returns server-authorized ID", async () => {
      const extractor = createStrictThreadScopeResolver(async () => "user-123");

      const result = await extractor({
        request: createRequest(),
        clientDeclared: "user-123",
      });

      expect(result).toEqual({ resourceId: "user-123" });
    });

    it("should validate client-declared matches server ID", async () => {
      const extractor = createStrictThreadScopeResolver(async () => "user-123");

      await expect(
        extractor({
          request: createRequest(),
          clientDeclared: "user-999",
        })
      ).rejects.toThrow("Unauthorized");
    });

    it("should allow undefined client-declared", async () => {
      const extractor = createStrictThreadScopeResolver(async () => "user-123");

      const result = await extractor({
        request: createRequest(),
        clientDeclared: undefined,
      });

      expect(result).toEqual({ resourceId: "user-123" });
    });

    it("should handle array from getUserId", async () => {
      const extractor = createStrictThreadScopeResolver(async () => [
        "user-123",
        "workspace-456",
      ]);

      const result = await extractor({
        request: createRequest(),
        clientDeclared: "workspace-456",
      });

      expect(result).toEqual({ resourceId: ["user-123", "workspace-456"] });
    });

    it("should pass request to getUserId function", async () => {
      let receivedRequest: Request | undefined;
      const extractor = createStrictThreadScopeResolver(async (request) => {
        receivedRequest = request;
        return "user-123";
      });

      const request = createRequest();
      await extractor({ request, clientDeclared: "user-123" });

      expect(receivedRequest).toBe(request);
    });
  });

  describe("validation scenarios", () => {
    it("should validate when client declares one of multiple authorized IDs", async () => {
      const extractor = createStrictThreadScopeResolver(async () => [
        "user-123",
        "workspace-456",
      ]);

      const result = await extractor({
        request: createRequest(),
        clientDeclared: "user-123",
      });

      expect(result).toEqual({ resourceId: ["user-123", "workspace-456"] });
    });

    it("should validate when client declares array with match", async () => {
      const extractor = createStrictThreadScopeResolver(async () => "user-123");

      const result = await extractor({
        request: createRequest(),
        clientDeclared: ["user-123", "other"],
      });

      expect(result).toEqual({ resourceId: "user-123" });
    });

    it("should reject when client declares array with no matches", async () => {
      const extractor = createStrictThreadScopeResolver(async () => "user-123");

      await expect(
        extractor({
          request: createRequest(),
          clientDeclared: ["user-999", "other"],
        })
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("async getUserId", () => {
    it("should handle async getUserId with delay", async () => {
      const extractor = createStrictThreadScopeResolver(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "user-123";
      });

      const result = await extractor({
        request: createRequest(),
        clientDeclared: "user-123",
      });

      expect(result).toEqual({ resourceId: "user-123" });
    });

    it("should propagate getUserId errors", async () => {
      const extractor = createStrictThreadScopeResolver(async () => {
        throw new Error("Authentication failed");
      });

      await expect(
        extractor({
          request: createRequest(),
          clientDeclared: "user-123",
        })
      ).rejects.toThrow("Authentication failed");
    });
  });
});

describe("createFilteringThreadScopeResolver", () => {
  const createRequest = () => new Request("https://example.com/api");

  describe("basic functionality", () => {
    it("should create extractor that returns all authorized when no client hint", async () => {
      const extractor = createFilteringThreadScopeResolver(async () => [
        "workspace-1",
        "workspace-2",
        "workspace-3",
      ]);

      const result = await extractor({
        request: createRequest(),
        clientDeclared: undefined,
      });

      expect(result).toEqual({
        resourceId: ["workspace-1", "workspace-2", "workspace-3"],
      });
    });

    it("should filter to only authorized IDs", async () => {
      const extractor = createFilteringThreadScopeResolver(async () => [
        "workspace-1",
        "workspace-2",
        "workspace-3",
      ]);

      const result = await extractor({
        request: createRequest(),
        clientDeclared: ["workspace-1", "workspace-99"],
      });

      expect(result).toEqual({ resourceId: ["workspace-1"] });
    });

    it("should return single string when client is string", async () => {
      const extractor = createFilteringThreadScopeResolver(async () => [
        "workspace-1",
        "workspace-2",
      ]);

      const result = await extractor({
        request: createRequest(),
        clientDeclared: "workspace-1",
      });

      expect(result).toEqual({ resourceId: "workspace-1" });
    });

    it("should throw when no client IDs are authorized", async () => {
      const extractor = createFilteringThreadScopeResolver(async () => [
        "workspace-1",
        "workspace-2",
      ]);

      await expect(
        extractor({
          request: createRequest(),
          clientDeclared: ["workspace-99", "workspace-88"],
        })
      ).rejects.toThrow("Unauthorized: None of the client-declared resourceIds are authorized");
    });

    it("should pass request to getUserResourceIds function", async () => {
      let receivedRequest: Request | undefined;
      const extractor = createFilteringThreadScopeResolver(async (request) => {
        receivedRequest = request;
        return ["workspace-1"];
      });

      const request = createRequest();
      await extractor({ request, clientDeclared: "workspace-1" });

      expect(receivedRequest).toBe(request);
    });
  });

  describe("filtering scenarios", () => {
    it("should filter multiple client IDs to authorized subset", async () => {
      const extractor = createFilteringThreadScopeResolver(async () => [
        "ws-1",
        "ws-2",
        "ws-3",
        "ws-4",
      ]);

      const result = await extractor({
        request: createRequest(),
        clientDeclared: ["ws-1", "ws-99", "ws-3", "ws-88"],
      });

      expect(result).toEqual({ resourceId: ["ws-1", "ws-3"] });
    });

    it("should preserve order of client-declared IDs", async () => {
      const extractor = createFilteringThreadScopeResolver(async () => [
        "ws-1",
        "ws-2",
        "ws-3",
        "ws-4",
      ]);

      const result = await extractor({
        request: createRequest(),
        clientDeclared: ["ws-4", "ws-2", "ws-1"],
      });

      // Should maintain client's order, not server's
      expect(result).toEqual({ resourceId: ["ws-4", "ws-2", "ws-1"] });
    });

    it("should handle single authorized workspace", async () => {
      const extractor = createFilteringThreadScopeResolver(async () => [
        "workspace-only",
      ]);

      const result = await extractor({
        request: createRequest(),
        clientDeclared: ["workspace-only", "other"],
      });

      expect(result).toEqual({ resourceId: ["workspace-only"] });
    });
  });

  describe("edge cases", () => {
    it("should handle empty client array", async () => {
      const extractor = createFilteringThreadScopeResolver(async () => [
        "workspace-1",
      ]);

      await expect(
        extractor({
          request: createRequest(),
          clientDeclared: [],
        })
      ).rejects.toThrow("Unauthorized");
    });

    it("should handle empty authorized array", async () => {
      const extractor = createFilteringThreadScopeResolver(async () => []);

      await expect(
        extractor({
          request: createRequest(),
          clientDeclared: ["workspace-1"],
        })
      ).rejects.toThrow("Unauthorized");
    });

    it("should handle duplicate IDs in client array", async () => {
      const extractor = createFilteringThreadScopeResolver(async () => [
        "ws-1",
        "ws-2",
      ]);

      const result = await extractor({
        request: createRequest(),
        clientDeclared: ["ws-1", "ws-1", "ws-2"],
      });

      expect(result).toEqual({ resourceId: ["ws-1", "ws-1", "ws-2"] });
    });

    it("should handle special characters", async () => {
      const specialId = "workspace@example.com/project#123";
      const extractor = createFilteringThreadScopeResolver(async () => [specialId]);

      const result = await extractor({
        request: createRequest(),
        clientDeclared: specialId,
      });

      expect(result).toEqual({ resourceId: specialId });
    });

    it("should handle Unicode characters", async () => {
      const unicodeId = "工作空间-123";
      const extractor = createFilteringThreadScopeResolver(async () => [unicodeId]);

      const result = await extractor({
        request: createRequest(),
        clientDeclared: [unicodeId],
      });

      expect(result).toEqual({ resourceId: [unicodeId] });
    });
  });

  describe("async getUserResourceIds", () => {
    it("should handle async getUserResourceIds with delay", async () => {
      const extractor = createFilteringThreadScopeResolver(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ["workspace-1"];
      });

      const result = await extractor({
        request: createRequest(),
        clientDeclared: "workspace-1",
      });

      expect(result).toEqual({ resourceId: "workspace-1" });
    });

    it("should propagate getUserResourceIds errors", async () => {
      const extractor = createFilteringThreadScopeResolver(async () => {
        throw new Error("Failed to fetch workspaces");
      });

      await expect(
        extractor({
          request: createRequest(),
          clientDeclared: "workspace-1",
        })
      ).rejects.toThrow("Failed to fetch workspaces");
    });
  });
});
