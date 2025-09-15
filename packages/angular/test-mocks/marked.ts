// A lightweight test mock for Marked that supports code block parsing
// and a walkTokens hook sufficient for our renderer tests.
export class Marked {
  private options: any = {};
  private walkTokensHook?: (token: any) => void;

  setOptions(opts: any) {
    this.options = { ...this.options, ...opts };
  }

  use(plugin: any) {
    if (plugin && typeof plugin.walkTokens === "function") {
      this.walkTokensHook = plugin.walkTokens.bind(plugin);
    }
  }

  // Very small parser that only recognizes triple-backtick code blocks.
  // For each code block, it constructs a token and passes it to walkTokens,
  // allowing the caller (our renderer) to transform it into custom HTML.
  parse(src: string) {
    const codeBlockRegex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let result = "";
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(src)) !== null) {
      const [full, lang = "", code = ""] = match;
      // Append text before the code block untouched
      result += src.slice(lastIndex, match.index);

      // Build a token for the code block and let walkTokens mutate it
      const token: any = { type: "code", lang, text: code };
      if (this.walkTokensHook) {
        try {
          this.walkTokensHook(token);
        } catch {
          // ignore hook errors in tests
        }
      }

      if (token.type === "html" && typeof token.text === "string") {
        // Renderer transformed it into custom HTML
        result += token.text;
      } else {
        // Fallback: basic pre/code HTML
        const cls = lang ? ` class="language-${lang}"` : "";
        result += `<pre><code${cls}>${this.escapeHtml(code)}</code></pre>`;
      }

      lastIndex = match.index + full.length;
    }

    // Append the rest of the string
    result += src.slice(lastIndex);
    return result;
  }

  private escapeHtml(text: string) {
    const div = globalThis.document?.createElement?.("div");
    if (!div) return text.replace(/[&<>\"]/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    }[c] as string));
    div.textContent = text;
    return div.innerHTML;
  }
}
