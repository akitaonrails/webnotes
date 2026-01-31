/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest"

// Test the indent parsing logic extracted from app_controller
function parseIndentSetting(value) {
  if (value === undefined || value === null || value === "") {
    return "  " // Default: 2 spaces
  }
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 0) {
    return "  " // Default: 2 spaces
  }
  if (num === 0) {
    return "\t" // Tab character
  }
  // Clamp to 1-6 spaces
  const spaces = Math.min(Math.max(num, 1), 6)
  return " ".repeat(spaces)
}

// Test the indent/unindent logic
function indentLines(text, indent) {
  return text.split("\n").map(line => indent + line).join("\n")
}

function unindentLines(text, indent) {
  return text.split("\n").map(line => {
    // Try to remove the exact indent string first
    if (line.startsWith(indent)) {
      return line.substring(indent.length)
    }
    // If indent is spaces, try removing up to that many leading spaces
    if (indent !== "\t") {
      const indentLength = indent.length
      let removeCount = 0
      for (let i = 0; i < Math.min(indentLength, line.length); i++) {
        if (line[i] === " ") {
          removeCount++
        } else {
          break
        }
      }
      if (removeCount > 0) {
        return line.substring(removeCount)
      }
    }
    // Try removing a single tab if present
    if (line.startsWith("\t")) {
      return line.substring(1)
    }
    return line
  }).join("\n")
}

describe("parseIndentSetting", () => {
  it("returns 2 spaces by default", () => {
    expect(parseIndentSetting(undefined)).toBe("  ")
    expect(parseIndentSetting(null)).toBe("  ")
    expect(parseIndentSetting("")).toBe("  ")
  })

  it("returns tab character for 0", () => {
    expect(parseIndentSetting(0)).toBe("\t")
    expect(parseIndentSetting("0")).toBe("\t")
  })

  it("returns 1 space for 1", () => {
    expect(parseIndentSetting(1)).toBe(" ")
    expect(parseIndentSetting("1")).toBe(" ")
  })

  it("returns 2 spaces for 2", () => {
    expect(parseIndentSetting(2)).toBe("  ")
    expect(parseIndentSetting("2")).toBe("  ")
  })

  it("returns 4 spaces for 4", () => {
    expect(parseIndentSetting(4)).toBe("    ")
    expect(parseIndentSetting("4")).toBe("    ")
  })

  it("returns 6 spaces for 6", () => {
    expect(parseIndentSetting(6)).toBe("      ")
    expect(parseIndentSetting("6")).toBe("      ")
  })

  it("clamps to 6 spaces for values > 6", () => {
    expect(parseIndentSetting(7)).toBe("      ")
    expect(parseIndentSetting(10)).toBe("      ")
    expect(parseIndentSetting(100)).toBe("      ")
  })

  it("returns default for negative values", () => {
    expect(parseIndentSetting(-1)).toBe("  ")
    expect(parseIndentSetting(-5)).toBe("  ")
  })

  it("returns default for non-numeric strings", () => {
    expect(parseIndentSetting("abc")).toBe("  ")
    expect(parseIndentSetting("foo")).toBe("  ")
  })
})

describe("indentLines", () => {
  it("adds indent to single line", () => {
    expect(indentLines("hello", "  ")).toBe("  hello")
  })

  it("adds indent to multiple lines", () => {
    expect(indentLines("line1\nline2\nline3", "  ")).toBe("  line1\n  line2\n  line3")
  })

  it("adds tab indent", () => {
    expect(indentLines("hello\nworld", "\t")).toBe("\thello\n\tworld")
  })

  it("adds 4 space indent", () => {
    expect(indentLines("code", "    ")).toBe("    code")
  })

  it("handles empty lines", () => {
    expect(indentLines("line1\n\nline3", "  ")).toBe("  line1\n  \n  line3")
  })
})

describe("unindentLines", () => {
  it("removes exact indent from single line", () => {
    expect(unindentLines("  hello", "  ")).toBe("hello")
  })

  it("removes exact indent from multiple lines", () => {
    expect(unindentLines("  line1\n  line2\n  line3", "  ")).toBe("line1\nline2\nline3")
  })

  it("removes tab indent", () => {
    expect(unindentLines("\thello\n\tworld", "\t")).toBe("hello\nworld")
  })

  it("removes partial indent when line has fewer spaces", () => {
    // If indent is 4 spaces but line only has 2, remove those 2
    expect(unindentLines(" hello", "    ")).toBe("hello")
    expect(unindentLines("  hello", "    ")).toBe("hello")
    expect(unindentLines("   hello", "    ")).toBe("hello")
  })

  it("does not remove non-space characters", () => {
    expect(unindentLines("hello", "  ")).toBe("hello")
    expect(unindentLines("xhello", "  ")).toBe("xhello")
  })

  it("removes tab when spaces expected but tab found", () => {
    expect(unindentLines("\thello", "  ")).toBe("hello")
  })

  it("handles mixed indentation", () => {
    // First line has 2 spaces, second has 4, third has none
    expect(unindentLines("  line1\n    line2\nline3", "  ")).toBe("line1\n  line2\nline3")
  })

  it("handles empty lines", () => {
    expect(unindentLines("  line1\n\n  line3", "  ")).toBe("line1\n\nline3")
  })
})

describe("indent roundtrip", () => {
  it("indent then unindent returns original", () => {
    const original = "line1\nline2\nline3"
    const indent = "  "
    const indented = indentLines(original, indent)
    const unindented = unindentLines(indented, indent)
    expect(unindented).toBe(original)
  })

  it("works with tabs", () => {
    const original = "code\nmore code"
    const indent = "\t"
    const indented = indentLines(original, indent)
    const unindented = unindentLines(indented, indent)
    expect(unindented).toBe(original)
  })

  it("preserves existing indentation", () => {
    const original = "  already indented\n    more indented"
    const indent = "  "
    const indented = indentLines(original, indent)
    expect(indented).toBe("    already indented\n      more indented")
    const unindented = unindentLines(indented, indent)
    expect(unindented).toBe(original)
  })
})
