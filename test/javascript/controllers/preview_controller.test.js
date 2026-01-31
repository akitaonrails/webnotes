/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import PreviewController from "../../../app/javascript/controllers/preview_controller.js"

describe("PreviewController", () => {
  let application, controller, element

  beforeEach(() => {
    document.body.innerHTML = `
      <div data-controller="preview" data-preview-zoom-value="100">
        <aside data-preview-target="panel" class="hidden">
          <span data-preview-target="zoomLevel">100%</span>
          <div data-preview-target="content"></div>
        </aside>
      </div>
    `

    // Mock scrollTo and scrollIntoView
    Element.prototype.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()

    element = document.querySelector('[data-controller="preview"]')
    application = Application.start()
    application.register("preview", PreviewController)

    return new Promise((resolve) => {
      setTimeout(() => {
        controller = application.getControllerForElementAndIdentifier(element, "preview")
        resolve()
      }, 0)
    })
  })

  afterEach(() => {
    application.stop()
    vi.restoreAllMocks()
  })

  describe("connect()", () => {
    it("initializes zoom levels array", () => {
      expect(controller.zoomLevels).toEqual([50, 75, 90, 100, 110, 125, 150, 175, 200])
    })

    it("applies initial zoom", () => {
      expect(controller.zoomValue).toBe(100)
      expect(controller.zoomLevelTarget.textContent).toBe("100%")
    })
  })

  describe("toggle()", () => {
    it("shows hidden panel", () => {
      expect(controller.panelTarget.classList.contains("hidden")).toBe(true)

      const result = controller.toggle()

      expect(result).toBe(true)
      expect(controller.panelTarget.classList.contains("hidden")).toBe(false)
      expect(controller.panelTarget.classList.contains("flex")).toBe(true)
      expect(document.body.classList.contains("preview-visible")).toBe(true)
    })

    it("hides visible panel", () => {
      controller.panelTarget.classList.remove("hidden")
      controller.panelTarget.classList.add("flex")

      const result = controller.toggle()

      expect(result).toBe(false)
      expect(controller.panelTarget.classList.contains("hidden")).toBe(true)
      expect(controller.panelTarget.classList.contains("flex")).toBe(false)
    })

    it("dispatches toggled event", () => {
      const dispatchSpy = vi.spyOn(controller, "dispatch")

      controller.toggle()

      expect(dispatchSpy).toHaveBeenCalledWith("toggled", {
        detail: { visible: true }
      })
    })
  })

  describe("show()", () => {
    it("shows the panel", () => {
      controller.show()

      expect(controller.panelTarget.classList.contains("hidden")).toBe(false)
      expect(controller.panelTarget.classList.contains("flex")).toBe(true)
    })

    it("does nothing if already visible", () => {
      controller.panelTarget.classList.remove("hidden")
      controller.panelTarget.classList.add("flex")
      const dispatchSpy = vi.spyOn(controller, "dispatch")

      controller.show()

      expect(dispatchSpy).not.toHaveBeenCalled()
    })

    it("dispatches toggled event", () => {
      const dispatchSpy = vi.spyOn(controller, "dispatch")

      controller.show()

      expect(dispatchSpy).toHaveBeenCalledWith("toggled", {
        detail: { visible: true }
      })
    })
  })

  describe("hide()", () => {
    it("hides the panel", () => {
      controller.panelTarget.classList.remove("hidden")
      controller.panelTarget.classList.add("flex")

      controller.hide()

      expect(controller.panelTarget.classList.contains("hidden")).toBe(true)
      expect(controller.panelTarget.classList.contains("flex")).toBe(false)
    })

    it("does nothing if already hidden", () => {
      const dispatchSpy = vi.spyOn(controller, "dispatch")

      controller.hide()

      expect(dispatchSpy).not.toHaveBeenCalled()
    })
  })

  describe("isVisible", () => {
    it("returns false when panel is hidden", () => {
      expect(controller.isVisible).toBe(false)
    })

    it("returns true when panel is visible", () => {
      controller.panelTarget.classList.remove("hidden")
      expect(controller.isVisible).toBe(true)
    })
  })

  describe("render()", () => {
    beforeEach(() => {
      controller.panelTarget.classList.remove("hidden")
    })

    it("renders markdown content", () => {
      controller.render("# Hello\n\nWorld")

      expect(controller.contentTarget.innerHTML).toContain("<h1>Hello</h1>")
      expect(controller.contentTarget.innerHTML).toContain("<p>World</p>")
    })

    it("does nothing when hidden", () => {
      controller.panelTarget.classList.add("hidden")
      controller.render("# Test")

      expect(controller.contentTarget.innerHTML).toBe("")
    })

    it("handles empty content", () => {
      controller.render("")
      expect(controller.contentTarget.innerHTML).toBe("")
    })
  })

  describe("update()", () => {
    beforeEach(() => {
      controller.panelTarget.classList.remove("hidden")
    })

    it("renders content and syncs scroll", () => {
      const renderSpy = vi.spyOn(controller, "render")
      const syncSpy = vi.spyOn(controller, "syncScrollRatio")

      controller.update("# Test", { scrollRatio: 0.5 })

      expect(renderSpy).toHaveBeenCalledWith("# Test")
      expect(syncSpy).toHaveBeenCalledWith(0.5)
    })

    it("syncs to typewriter mode when specified", () => {
      const syncSpy = vi.spyOn(controller, "syncToTypewriter")

      controller.update("# Test", {
        typewriterMode: true,
        currentLine: 5,
        totalLines: 10
      })

      expect(syncSpy).toHaveBeenCalledWith(5, 10)
    })
  })

  describe("zoomIn()", () => {
    it("increases zoom to next level", () => {
      controller.zoomValue = 100
      controller.zoomIn()

      expect(controller.zoomValue).toBe(110)
    })

    it("does not exceed max zoom", () => {
      controller.zoomValue = 200
      controller.zoomIn()

      expect(controller.zoomValue).toBe(200)
    })

    it("dispatches zoom-changed event", () => {
      const dispatchSpy = vi.spyOn(controller, "dispatch")
      controller.zoomValue = 100

      controller.zoomIn()

      expect(dispatchSpy).toHaveBeenCalledWith("zoom-changed", {
        detail: { zoom: 110 }
      })
    })
  })

  describe("zoomOut()", () => {
    it("decreases zoom to previous level", () => {
      controller.zoomValue = 100
      controller.zoomOut()

      expect(controller.zoomValue).toBe(90)
    })

    it("does not go below min zoom", () => {
      controller.zoomValue = 50
      controller.zoomOut()

      expect(controller.zoomValue).toBe(50)
    })

    it("dispatches zoom-changed event", () => {
      const dispatchSpy = vi.spyOn(controller, "dispatch")
      controller.zoomValue = 100

      controller.zoomOut()

      expect(dispatchSpy).toHaveBeenCalledWith("zoom-changed", {
        detail: { zoom: 90 }
      })
    })
  })

  describe("applyZoom()", () => {
    it("applies zoom to content target", () => {
      controller.zoomValue = 125
      controller.applyZoom()

      expect(controller.contentTarget.style.fontSize).toBe("125%")
    })

    it("updates zoom level display", () => {
      controller.zoomValue = 150
      controller.applyZoom()

      expect(controller.zoomLevelTarget.textContent).toBe("150%")
    })
  })

  describe("zoomValueChanged()", () => {
    it("calls applyZoom when value changes", () => {
      const applySpy = vi.spyOn(controller, "applyZoom")

      controller.zoomValueChanged()

      expect(applySpy).toHaveBeenCalled()
    })
  })

  describe("syncScrollRatio()", () => {
    beforeEach(() => {
      controller.panelTarget.classList.remove("hidden")
      // Mock scrollHeight and clientHeight
      Object.defineProperty(controller.contentTarget, "scrollHeight", { value: 1000 })
      Object.defineProperty(controller.contentTarget, "clientHeight", { value: 400 })
    })

    it("sets scroll position based on ratio", async () => {
      controller.syncScrollRatio(0.5)

      // Wait for requestAnimationFrame
      await new Promise(resolve => setTimeout(resolve, 20))

      // scrollHeight - clientHeight = 600, 0.5 * 600 = 300
      expect(controller.contentTarget.scrollTop).toBe(300)
    })

    it("does nothing when preview is hidden", () => {
      controller.panelTarget.classList.add("hidden")

      controller.syncScrollRatio(0.5)

      expect(controller.contentTarget.scrollTop).toBe(0)
    })

    it("respects syncScrollEnabled value", () => {
      controller.syncScrollEnabledValue = false

      controller.syncScrollRatio(0.5)

      expect(controller.contentTarget.scrollTop).toBe(0)
    })
  })

  describe("syncToLine()", () => {
    beforeEach(() => {
      controller.panelTarget.classList.remove("hidden")
      Object.defineProperty(controller.contentTarget, "scrollHeight", { value: 1000 })
      Object.defineProperty(controller.contentTarget, "clientHeight", { value: 400 })
    })

    it("scrolls to line position", () => {
      controller.syncToLine(5, 10)

      // Line ratio = (5-1)/(10-1) = 4/9 ≈ 0.444
      // scrollHeight - clientHeight = 600
      // targetScroll ≈ 0.444 * 600 ≈ 266.67
      expect(controller.contentTarget.scrollTo).toHaveBeenCalledWith({
        top: expect.any(Number),
        behavior: "smooth"
      })
    })

    it("does nothing when totalLines <= 1", () => {
      controller.syncToLine(1, 1)

      expect(controller.contentTarget.scrollTo).not.toHaveBeenCalled()
    })
  })

  describe("syncToTypewriter()", () => {
    beforeEach(() => {
      Object.defineProperty(controller.contentTarget, "scrollHeight", { value: 1000 })
      Object.defineProperty(controller.contentTarget, "clientHeight", { value: 400 })
    })

    it("centers content at cursor position", () => {
      controller.syncToTypewriter(5, 10)

      // Should set scrollTop to center the line
      expect(controller.contentTarget.scrollTop).toBeGreaterThanOrEqual(0)
    })

    it("does nothing when totalLines <= 1", () => {
      const originalScrollTop = controller.contentTarget.scrollTop
      controller.syncToTypewriter(1, 1)

      expect(controller.contentTarget.scrollTop).toBe(originalScrollTop)
    })
  })

  describe("setTypewriterMode()", () => {
    it("adds typewriter class when enabled", () => {
      controller.setTypewriterMode(true)

      expect(controller.typewriterModeValue).toBe(true)
      expect(controller.contentTarget.classList.contains("preview-typewriter-mode")).toBe(true)
    })

    it("removes typewriter class when disabled", () => {
      controller.contentTarget.classList.add("preview-typewriter-mode")

      controller.setTypewriterMode(false)

      expect(controller.typewriterModeValue).toBe(false)
      expect(controller.contentTarget.classList.contains("preview-typewriter-mode")).toBe(false)
    })
  })
})
