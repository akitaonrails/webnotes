/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import ContentSearchController from "../../../app/javascript/controllers/content_search_controller.js"

describe("ContentSearchController", () => {
  let application, controller, element

  beforeEach(() => {
    window.t = vi.fn((key) => key)

    document.body.innerHTML = `
      <div data-controller="content-search">
        <dialog data-content-search-target="dialog"></dialog>
        <input data-content-search-target="input" type="text" />
        <div data-content-search-target="results"></div>
        <div data-content-search-target="status"></div>
      </div>
    `

    // Mock showModal and close for dialog
    HTMLDialogElement.prototype.showModal = vi.fn(function () {
      this.open = true
    })
    HTMLDialogElement.prototype.close = vi.fn(function () {
      this.open = false
    })

    // Mock scrollIntoView (not available in jsdom)
    Element.prototype.scrollIntoView = vi.fn()

    // Mock fetch for search
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    })

    element = document.querySelector('[data-controller="content-search"]')
    application = Application.start()
    application.register("content-search", ContentSearchController)

    return new Promise((resolve) => {
      setTimeout(() => {
        controller = application.getControllerForElementAndIdentifier(element, "content-search")
        resolve()
      }, 0)
    })
  })

  afterEach(() => {
    application.stop()
    vi.restoreAllMocks()
  })

  describe("connect()", () => {
    it("initializes empty state", () => {
      expect(controller.searchResultsData).toEqual([])
      expect(controller.selectedIndex).toBe(0)
      expect(controller.searchTimeout).toBeNull()
      expect(controller.usingKeyboard).toBe(false)
    })
  })

  describe("open()", () => {
    it("opens dialog", () => {
      controller.open()

      expect(controller.dialogTarget.showModal).toHaveBeenCalled()
    })

    it("clears previous state", () => {
      controller.searchResultsData = [{ path: "old.md" }]
      controller.selectedIndex = 5
      controller.inputTarget.value = "old search"

      controller.open()

      expect(controller.searchResultsData).toEqual([])
      expect(controller.selectedIndex).toBe(0)
      expect(controller.inputTarget.value).toBe("")
    })

    it("clears results display", () => {
      controller.resultsTarget.innerHTML = "old content"
      controller.open()

      expect(controller.resultsTarget.innerHTML).toBe("")
    })

    it("shows initial status message", () => {
      controller.open()

      expect(controller.statusTarget.textContent).toBe("status.type_to_search_regex")
    })
  })

  describe("close()", () => {
    it("closes the dialog", () => {
      controller.close()
      expect(controller.dialogTarget.close).toHaveBeenCalled()
    })
  })

  describe("onInput()", () => {
    it("clears results when query is empty", () => {
      controller.searchResultsData = [{ path: "test.md" }]
      controller.inputTarget.value = ""
      controller.onInput()

      expect(controller.searchResultsData).toEqual([])
      expect(controller.resultsTarget.innerHTML).toBe("")
    })

    it("shows searching status", () => {
      controller.inputTarget.value = "test"
      controller.onInput()

      expect(controller.statusTarget.textContent).toBe("status.searching")
    })

    it("sets up debounced search", () => {
      const performSearchSpy = vi.spyOn(controller, "performSearch")
      controller.inputTarget.value = "test"
      controller.onInput()

      // Should not call immediately due to debounce
      expect(performSearchSpy).not.toHaveBeenCalled()
      // Should have a timeout set
      expect(controller.searchTimeout).not.toBeNull()
    })

    it("cancels previous timeout on new input", () => {
      controller.inputTarget.value = "first"
      controller.onInput()
      const firstTimeout = controller.searchTimeout

      controller.inputTarget.value = "second"
      controller.onInput()
      const secondTimeout = controller.searchTimeout

      // New timeout should be different from the first one
      expect(secondTimeout).not.toBe(firstTimeout)
    })
  })

  describe("performSearch()", () => {
    it("fetches search results", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          { path: "test.md", name: "test", line_number: 5, context: [] }
        ])
      })

      await controller.performSearch("hello")

      expect(global.fetch).toHaveBeenCalledWith(
        "/notes/search?q=hello",
        expect.objectContaining({ headers: { Accept: "application/json" } })
      )
    })

    it("updates results data", async () => {
      const results = [
        { path: "file1.md", name: "file1", line_number: 10, context: [] },
        { path: "file2.md", name: "file2", line_number: 20, context: [] }
      ]
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(results)
      })

      await controller.performSearch("test")

      expect(controller.searchResultsData).toEqual(results)
    })

    it("resets selected index", async () => {
      controller.selectedIndex = 3
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      })

      await controller.performSearch("test")

      expect(controller.selectedIndex).toBe(0)
    })

    it("shows match count in status", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          { path: "file1.md", name: "file1", line_number: 1, context: [] },
          { path: "file2.md", name: "file2", line_number: 2, context: [] }
        ])
      })

      await controller.performSearch("test")

      expect(controller.statusTarget.textContent).toContain("2 matches")
    })

    it("shows no matches message", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      })

      await controller.performSearch("xyz")

      expect(controller.statusTarget.textContent).toBe("status.no_matches")
    })

    it("handles search errors", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false })

      await controller.performSearch("test")

      expect(controller.statusTarget.textContent).toBe("status.search_error")
    })
  })

  describe("renderResults()", () => {
    it("shows no matches message when empty", () => {
      controller.searchResultsData = []
      controller.renderResults()

      expect(controller.resultsTarget.innerHTML).toContain("status.no_matches")
    })

    it("renders result items", () => {
      controller.searchResultsData = [
        {
          path: "notes/test.md",
          name: "test",
          line_number: 15,
          context: [
            { line_number: 14, content: "before", is_match: false },
            { line_number: 15, content: "matching line", is_match: true },
            { line_number: 16, content: "after", is_match: false }
          ]
        }
      ]
      controller.renderResults()

      const buttons = controller.resultsTarget.querySelectorAll("button")
      expect(buttons.length).toBe(1)
      expect(controller.resultsTarget.innerHTML).toContain("test")
      expect(controller.resultsTarget.innerHTML).toContain(":15")
    })

    it("highlights selected item", () => {
      controller.searchResultsData = [
        { path: "file1.md", name: "file1", line_number: 1, context: [] },
        { path: "file2.md", name: "file2", line_number: 2, context: [] }
      ]
      controller.selectedIndex = 1
      controller.renderResults()

      const buttons = controller.resultsTarget.querySelectorAll("button")
      expect(buttons[1].className).toContain("bg-[var(--theme-accent)]")
    })

    it("shows context lines with match highlighting", () => {
      controller.searchResultsData = [
        {
          path: "test.md",
          name: "test",
          line_number: 10,
          context: [
            { line_number: 10, content: "match here", is_match: true }
          ]
        }
      ]
      controller.renderResults()

      expect(controller.resultsTarget.innerHTML).toContain("bg-[var(--theme-selection)]")
    })
  })

  describe("onKeydown()", () => {
    beforeEach(() => {
      controller.searchResultsData = [
        { path: "file1.md", name: "file1", line_number: 1, context: [] },
        { path: "file2.md", name: "file2", line_number: 2, context: [] },
        { path: "file3.md", name: "file3", line_number: 3, context: [] }
      ]
      controller.selectedIndex = 1
    })

    it("moves selection down on ArrowDown", () => {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" })
      event.preventDefault = vi.fn()
      controller.onKeydown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(controller.selectedIndex).toBe(2)
      expect(controller.usingKeyboard).toBe(true)
    })

    it("moves selection up on ArrowUp", () => {
      const event = new KeyboardEvent("keydown", { key: "ArrowUp" })
      event.preventDefault = vi.fn()
      controller.onKeydown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(controller.selectedIndex).toBe(0)
      expect(controller.usingKeyboard).toBe(true)
    })

    it("does not go below 0", () => {
      controller.selectedIndex = 0
      const event = new KeyboardEvent("keydown", { key: "ArrowUp" })
      event.preventDefault = vi.fn()
      controller.onKeydown(event)

      expect(controller.selectedIndex).toBe(0)
    })

    it("does not exceed list length", () => {
      controller.selectedIndex = 2
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" })
      event.preventDefault = vi.fn()
      controller.onKeydown(event)

      expect(controller.selectedIndex).toBe(2)
    })

    it("calls selectCurrent on Enter", () => {
      const selectSpy = vi.spyOn(controller, "selectCurrent")
      const event = new KeyboardEvent("keydown", { key: "Enter" })
      event.preventDefault = vi.fn()
      controller.onKeydown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(selectSpy).toHaveBeenCalled()
    })
  })

  describe("scrollIntoView()", () => {
    it("scrolls selected element into view", () => {
      const mockElement = { scrollIntoView: vi.fn() }
      controller.resultsTarget.querySelector = vi.fn().mockReturnValue(mockElement)
      controller.selectedIndex = 1

      controller.scrollIntoView()

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ block: "nearest" })
    })

    it("handles missing element gracefully", () => {
      controller.resultsTarget.querySelector = vi.fn().mockReturnValue(null)

      expect(() => controller.scrollIntoView()).not.toThrow()
    })
  })

  describe("onHover()", () => {
    beforeEach(() => {
      controller.searchResultsData = [
        { path: "file1.md", name: "file1", line_number: 1, context: [] },
        { path: "file2.md", name: "file2", line_number: 2, context: [] }
      ]
    })

    it("updates selection on hover", () => {
      controller.selectedIndex = 0
      const event = { currentTarget: { dataset: { index: "1" } } }

      controller.onHover(event)

      expect(controller.selectedIndex).toBe(1)
    })

    it("ignores hover when using keyboard", () => {
      controller.usingKeyboard = true
      controller.selectedIndex = 0
      const event = { currentTarget: { dataset: { index: "1" } } }

      controller.onHover(event)

      expect(controller.selectedIndex).toBe(0)
    })

    it("does not re-render if same index", () => {
      const renderSpy = vi.spyOn(controller, "renderResults")
      controller.selectedIndex = 1
      const event = { currentTarget: { dataset: { index: "1" } } }

      controller.onHover(event)

      expect(renderSpy).not.toHaveBeenCalled()
    })
  })

  describe("onMouseMove()", () => {
    it("re-enables mouse selection", () => {
      controller.usingKeyboard = true
      controller.onMouseMove()

      expect(controller.usingKeyboard).toBe(false)
    })
  })

  describe("selectFromClick()", () => {
    it("dispatches selected event with path and line", () => {
      const dispatchSpy = vi.spyOn(controller, "dispatch")
      const event = {
        currentTarget: {
          dataset: { path: "folder/note.md", line: "25" }
        }
      }

      controller.selectFromClick(event)

      expect(dispatchSpy).toHaveBeenCalledWith("selected", {
        detail: { path: "folder/note.md", lineNumber: 25 }
      })
    })
  })

  describe("selectCurrent()", () => {
    it("dispatches selected event for current selection", () => {
      const dispatchSpy = vi.spyOn(controller, "dispatch")
      controller.searchResultsData = [
        { path: "file1.md", name: "file1", line_number: 10, context: [] },
        { path: "file2.md", name: "file2", line_number: 20, context: [] }
      ]
      controller.selectedIndex = 1

      controller.selectCurrent()

      expect(dispatchSpy).toHaveBeenCalledWith("selected", {
        detail: { path: "file2.md", lineNumber: 20 }
      })
    })

    it("does nothing when no results", () => {
      const dispatchSpy = vi.spyOn(controller, "dispatch")
      controller.searchResultsData = []

      controller.selectCurrent()

      expect(dispatchSpy).not.toHaveBeenCalled()
    })
  })

  describe("dispatchSelected()", () => {
    it("dispatches event and closes dialog", () => {
      const dispatchSpy = vi.spyOn(controller, "dispatch")
      const closeSpy = vi.spyOn(controller, "close")

      controller.dispatchSelected("test/path.md", 42)

      expect(dispatchSpy).toHaveBeenCalledWith("selected", {
        detail: { path: "test/path.md", lineNumber: 42 }
      })
      expect(closeSpy).toHaveBeenCalled()
    })
  })
})
