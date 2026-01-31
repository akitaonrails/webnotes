/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import FileFinderController from "../../../app/javascript/controllers/file_finder_controller.js"

describe("FileFinderController", () => {
  let application, controller, element

  beforeEach(() => {
    window.t = vi.fn((key) => key)

    document.body.innerHTML = `
      <div data-controller="file-finder">
        <dialog data-file-finder-target="dialog"></dialog>
        <input data-file-finder-target="input" type="text" />
        <div data-file-finder-target="results"></div>
        <div data-file-finder-target="preview"></div>
      </div>
    `

    // Mock showModal and close for dialog
    HTMLDialogElement.prototype.showModal = vi.fn(function () {
      this.open = true
    })
    HTMLDialogElement.prototype.close = vi.fn(function () {
      this.open = false
    })

    // Mock fetch for file preview
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: "# Test\nContent here" })
    })

    element = document.querySelector('[data-controller="file-finder"]')
    application = Application.start()
    application.register("file-finder", FileFinderController)

    return new Promise((resolve) => {
      setTimeout(() => {
        controller = application.getControllerForElementAndIdentifier(element, "file-finder")
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
      expect(controller.allFiles).toEqual([])
      expect(controller.filteredResults).toEqual([])
      expect(controller.selectedIndex).toBe(0)
    })
  })

  describe("open()", () => {
    const testFiles = [
      { name: "note1.md", path: "note1.md" },
      { name: "note2.md", path: "folder/note2.md" },
      { name: "readme.md", path: "docs/readme.md" }
    ]

    it("opens dialog with files", () => {
      controller.open(testFiles)

      expect(controller.dialogTarget.showModal).toHaveBeenCalled()
      expect(controller.allFiles).toEqual(testFiles)
    })

    it("clears input field", () => {
      controller.inputTarget.value = "old search"
      controller.open(testFiles)

      expect(controller.inputTarget.value).toBe("")
    })

    it("shows first 10 files initially", () => {
      const manyFiles = Array.from({ length: 20 }, (_, i) => ({
        name: `file${i}.md`,
        path: `file${i}.md`
      }))

      controller.open(manyFiles)

      expect(controller.filteredResults.length).toBe(10)
    })

    it("resets selected index", () => {
      controller.selectedIndex = 5
      controller.open(testFiles)

      expect(controller.selectedIndex).toBe(0)
    })
  })

  describe("close()", () => {
    it("closes the dialog", () => {
      controller.close()
      expect(controller.dialogTarget.close).toHaveBeenCalled()
    })
  })

  describe("onInput()", () => {
    const testFiles = [
      { name: "apple.md", path: "apple.md" },
      { name: "banana.md", path: "banana.md" },
      { name: "cherry.md", path: "folder/cherry.md" }
    ]

    beforeEach(() => {
      controller.allFiles = testFiles
    })

    it("filters files based on input", () => {
      controller.inputTarget.value = "ban"
      controller.onInput()

      expect(controller.filteredResults.length).toBe(1)
      expect(controller.filteredResults[0].name).toBe("banana.md")
    })

    it("shows all files when input is empty", () => {
      controller.inputTarget.value = ""
      controller.onInput()

      expect(controller.filteredResults.length).toBe(3)
    })

    it("resets selected index on new search", () => {
      controller.selectedIndex = 2
      controller.inputTarget.value = "app"
      controller.onInput()

      expect(controller.selectedIndex).toBe(0)
    })

    it("searches in full path including directory", () => {
      controller.inputTarget.value = "folder"
      controller.onInput()

      expect(controller.filteredResults.length).toBe(1)
      expect(controller.filteredResults[0].name).toBe("cherry.md")
    })
  })

  describe("renderResults()", () => {
    it("shows no files message when empty", () => {
      controller.filteredResults = []
      controller.renderResults()

      expect(controller.resultsTarget.innerHTML).toContain("sidebar.no_files_found")
    })

    it("renders file list with selection highlight", () => {
      controller.filteredResults = [
        { name: "file1.md", path: "file1.md" },
        { name: "file2.md", path: "file2.md" }
      ]
      controller.selectedIndex = 0
      controller.renderResults()

      const buttons = controller.resultsTarget.querySelectorAll("button")
      expect(buttons.length).toBe(2)
    })

    it("shows directory path when file is in folder", () => {
      controller.filteredResults = [
        { name: "note.md", path: "docs/notes/note.md" }
      ]
      controller.renderResults()

      expect(controller.resultsTarget.innerHTML).toContain("docs/notes")
    })
  })

  describe("onKeydown()", () => {
    beforeEach(() => {
      controller.filteredResults = [
        { name: "file1.md", path: "file1.md" },
        { name: "file2.md", path: "file2.md" },
        { name: "file3.md", path: "file3.md" }
      ]
      controller.selectedIndex = 1
    })

    it("moves selection down on ArrowDown", () => {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" })
      event.preventDefault = vi.fn()
      controller.onKeydown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(controller.selectedIndex).toBe(2)
    })

    it("moves selection up on ArrowUp", () => {
      const event = new KeyboardEvent("keydown", { key: "ArrowUp" })
      event.preventDefault = vi.fn()
      controller.onKeydown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(controller.selectedIndex).toBe(0)
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

  describe("onHover()", () => {
    it("updates selected index on hover", () => {
      controller.filteredResults = [
        { name: "file1.md", path: "file1.md" },
        { name: "file2.md", path: "file2.md" }
      ]
      controller.selectedIndex = 0

      const event = { currentTarget: { dataset: { index: "1" } } }
      controller.onHover(event)

      expect(controller.selectedIndex).toBe(1)
    })

    it("does not update if same index", () => {
      const renderSpy = vi.spyOn(controller, "renderResults")
      controller.selectedIndex = 1

      const event = { currentTarget: { dataset: { index: "1" } } }
      controller.onHover(event)

      expect(renderSpy).not.toHaveBeenCalled()
    })
  })

  describe("selectFromClick()", () => {
    it("dispatches selected event with path", () => {
      const dispatchSpy = vi.spyOn(controller, "dispatch")
      const event = { currentTarget: { dataset: { path: "folder/note.md" } } }

      controller.selectFromClick(event)

      expect(dispatchSpy).toHaveBeenCalledWith("selected", {
        detail: { path: "folder/note.md" }
      })
    })
  })

  describe("selectCurrent()", () => {
    it("dispatches selected event for current selection", () => {
      const dispatchSpy = vi.spyOn(controller, "dispatch")
      controller.filteredResults = [
        { name: "file1.md", path: "file1.md" },
        { name: "file2.md", path: "folder/file2.md" }
      ]
      controller.selectedIndex = 1

      controller.selectCurrent()

      expect(dispatchSpy).toHaveBeenCalledWith("selected", {
        detail: { path: "folder/file2.md" }
      })
    })

    it("does nothing when no results", () => {
      const dispatchSpy = vi.spyOn(controller, "dispatch")
      controller.filteredResults = []

      controller.selectCurrent()

      expect(dispatchSpy).not.toHaveBeenCalled()
    })
  })

  describe("dispatchSelected()", () => {
    it("dispatches event and closes dialog", () => {
      const dispatchSpy = vi.spyOn(controller, "dispatch")
      const closeSpy = vi.spyOn(controller, "close")

      controller.dispatchSelected("test/path.md")

      expect(dispatchSpy).toHaveBeenCalledWith("selected", {
        detail: { path: "test/path.md" }
      })
      expect(closeSpy).toHaveBeenCalled()
    })
  })

  describe("loadPreview()", () => {
    it("fetches file content for preview", async () => {
      controller.filteredResults = [{ name: "test.md", path: "test.md" }]
      controller.selectedIndex = 0

      await controller.loadPreview()

      expect(global.fetch).toHaveBeenCalledWith(
        "/notes/test.md",
        expect.objectContaining({ headers: { Accept: "application/json" } })
      )
    })

    it("shows preview content", async () => {
      controller.filteredResults = [{ name: "test.md", path: "test.md" }]
      controller.selectedIndex = 0

      await controller.loadPreview()

      expect(controller.previewTarget.innerHTML).toContain("Test")
    })

    it("handles empty results", async () => {
      controller.filteredResults = []

      await controller.loadPreview()

      expect(controller.previewTarget.innerHTML).toBe("")
    })

    it("shows error message on fetch failure", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false })
      controller.filteredResults = [{ name: "test.md", path: "test.md" }]
      controller.selectedIndex = 0

      await controller.loadPreview()

      expect(controller.previewTarget.innerHTML).toContain("Unable to load preview")
    })
  })
})
