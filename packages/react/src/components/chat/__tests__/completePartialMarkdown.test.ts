// No mocks needed - Vitest handles ES modules natively!
// Testing the real markdown processing functionality

import { CopilotAssistantMessage } from "../CopilotAssistantMessage";

const { completePartialMarkdown } = CopilotAssistantMessage;

describe("completePartialMarkdown", () => {
  describe("Markdown escaping behavior", () => {
    it("escapes incomplete bold markdown", () => {
      const input = "**unclosed bold";
      const result = completePartialMarkdown(input);

      expect(result).toBe("\\*\\*unclosed bold\n");
      expect(result).not.toBe(input);
    });

    it("escapes incomplete italic markdown", () => {
      const input = "This is *unclosed italic";
      const result = completePartialMarkdown(input);

      expect(result).toBe("This is \\*unclosed italic\n");
      expect(result).not.toBe(input);
    });

    it("escapes incomplete inline code", () => {
      const input = "Here is `unclosed inline code";
      const result = completePartialMarkdown(input);

      expect(result).toBe("Here is \\`unclosed inline code\n");
      expect(result).not.toBe(input);
    });

    it("handles code blocks properly", () => {
      const input = "```javascript\nconsole.log('test');";
      const result = completePartialMarkdown(input);

      expect(result).toBe("```javascript\nconsole.log('test');\n```\n");
      expect(result).not.toBe(input);
    });

    it("escapes multiple markdown elements", () => {
      const input = "**Bold and `code and *italic";
      const result = completePartialMarkdown(input);

      expect(result).toBe("\\*\\*Bold and \\`code and \\*italic\n");
      expect(result).not.toBe(input);
    });

    it("handles mixed complete and incomplete elements", () => {
      const input = "**Complete** bold and **incomplete bold";
      const result = completePartialMarkdown(input);

      expect(result).toBe("**Complete** bold and \\*\\*incomplete bold\n");
      expect(result).toContain("**Complete**"); // Complete part unchanged
      expect(result).toContain("\\*\\*incomplete bold"); // Incomplete part escaped
    });

    it("escapes nested incomplete elements", () => {
      const input = "**Bold with `nested code";
      const result = completePartialMarkdown(input);

      expect(result).toBe("\\*\\*Bold with \\`nested code\n");
      expect(result).not.toBe(input);
    });

    it("adds newline to complete markdown", () => {
      const input = "**Complete** and `complete` and *complete*";
      const result = completePartialMarkdown(input);

      expect(result).toBe("**Complete** and `complete` and *complete*\n");
    });

    it("handles complex scenarios", () => {
      const input = "Here's the **important** point and **incomplete";
      const result = completePartialMarkdown(input);

      expect(result).toBe(
        "Here's the **important** point and \\*\\*incomplete\n"
      );
      expect(result).toContain("**important**"); // Complete part unchanged
      expect(result).toContain("\\*\\*incomplete"); // Incomplete part escaped
    });

    it("handles strikethrough markdown", () => {
      const input = "This is ~~strikethrough text";
      const result = completePartialMarkdown(input);

      expect(typeof result).toBe("string");
      expect(result).toContain("strikethrough text");
    });
  });

  describe("Edge cases and stability", () => {
    it("handles empty input", () => {
      const input = "";
      const result = completePartialMarkdown(input);
      expect(result).toBe("");
    });

    it("handles whitespace-only input", () => {
      const input = "   \n  \t  ";
      const result = completePartialMarkdown(input);
      expect(result).toBe(""); // Function appears to trim whitespace
    });

    it("handles plain text without markdown", () => {
      const input = "Just some plain text";
      const result = completePartialMarkdown(input);
      expect(result).toBe("Just some plain text\n");
    });

    it("handles headings correctly", () => {
      const input = "# Main Heading\n## Sub Heading";
      const result = completePartialMarkdown(input);
      expect(result).toContain("Main Heading");
      expect(result).toContain("Sub Heading");
    });

    it("handles lists with incomplete markdown", () => {
      const input = "* Item 1\n* Item 2\n* **Bold item";
      const result = completePartialMarkdown(input);

      expect(result).toContain("Item 1");
      expect(result).toContain("Item 2");
      expect(result).toBe("* Item 1\n* Item 2\n* \\*\\*Bold item\n");
    });

    it("returns consistent results for same input", () => {
      const input = "**test** and *test*";
      const result1 = completePartialMarkdown(input);
      const result2 = completePartialMarkdown(input);
      expect(result1).toBe(result2);
    });

    it("never throws errors on valid string inputs", () => {
      const inputs = [
        "**bold**",
        "*italic*",
        "`code`",
        "```\nblock\n```",
        "# heading",
        "",
        "plain text",
        "**unclosed",
        "*unclosed",
        "`unclosed",
      ];

      inputs.forEach((input) => {
        expect(() => completePartialMarkdown(input)).not.toThrow();
      });
    });
  });

  describe("Real-world streaming scenarios", () => {
    it("handles partial API response streaming", () => {
      const input =
        "Here's the response:\n\n```javascript\nconst data = await fetch('/api/";
      const result = completePartialMarkdown(input);

      expect(result).toContain("Here's the response:");
      expect(result).toContain("const data = await fetch('/api/");
      expect(result).toBe(
        "Here's the response:\n\n```javascript\nconst data = await fetch('/api/\n```\n"
      );
    });

    it("handles streaming bold text", () => {
      const input = "The **important** point is **always";
      const result = completePartialMarkdown(input);

      expect(result).toBe("The **important** point is \\*\\*always\n");
      expect(result).toContain("**important**"); // Complete part unchanged
      expect(result).toContain("\\*\\*always"); // Incomplete part escaped
    });

    it("handles streaming inline code", () => {
      const input = "Use `npm install` or `npm run";
      const result = completePartialMarkdown(input);

      expect(result).toBe("Use `npm install` or \\`npm run\n");
      expect(result).toContain("`npm install`"); // Complete part unchanged
      expect(result).toContain("\\`npm run"); // Incomplete part escaped
    });
  });

  describe("Performance and robustness", () => {
    it("handles very long strings efficiently", () => {
      const input = "**" + "a".repeat(1000);
      const result = completePartialMarkdown(input);

      expect(result).toBe("\\*\\*" + "a".repeat(1000) + "\n");
      expect(result.length).toBeGreaterThan(1000);
    });

    it("handles complex nested incomplete elements", () => {
      const input = "**bold `code *italic";
      const result = completePartialMarkdown(input);

      // Should escape all incomplete elements
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(input.length);
    });

    it("handles special characters safely", () => {
      const input = "Text with & < > \" ' / \\ characters **and bold";
      const result = completePartialMarkdown(input);

      expect(result).toContain("characters");
      expect(result).toBe(
        "Text with & < > \" ' / \\ characters \\*\\*and bold\n"
      );
    });
  });
});
