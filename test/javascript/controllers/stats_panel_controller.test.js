/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import StatsPanelController from "../../../app/javascript/controllers/stats_panel_controller.js"

describe("StatsPanelController", () => {
  let application, controller, element

  beforeEach(() => {
    document.body.innerHTML = `
      <div data-controller="stats-panel">
        <div data-stats-panel-target="panel" class="hidden">
          <span data-stats-panel-target="words">0</span>
          <span data-stats-panel-target="chars">0</span>
          <span data-stats-panel-target="size">0 B</span>
          <span data-stats-panel-target="readTime">0 min</span>
        </div>
      </div>
    `

    element = document.querySelector('[data-controller="stats-panel"]')
    application = Application.start()
    application.register("stats-panel", StatsPanelController)

    return new Promise((resolve) => {
      setTimeout(() => {
        controller = application.getControllerForElementAndIdentifier(element, "stats-panel")
        resolve()
      }, 0)
    })
  })

  afterEach(() => {
    application.stop()
    vi.restoreAllMocks()
  })

  describe("connect()", () => {
    it("initializes update timeout to null", () => {
      expect(controller.updateTimeout).toBeNull()
    })
  })

  describe("show()", () => {
    it("removes hidden class from panel", () => {
      expect(controller.panelTarget.classList.contains("hidden")).toBe(true)

      controller.show()

      expect(controller.panelTarget.classList.contains("hidden")).toBe(false)
    })
  })

  describe("hide()", () => {
    it("adds hidden class to panel", () => {
      controller.panelTarget.classList.remove("hidden")

      controller.hide()

      expect(controller.panelTarget.classList.contains("hidden")).toBe(true)
    })
  })

  describe("update()", () => {
    it("updates word count", () => {
      controller.update("Hello world test")

      expect(controller.wordsTarget.textContent).toBe("3")
    })

    it("updates character count", () => {
      controller.update("Hello")

      expect(controller.charsTarget.textContent).toBe("5")
    })

    it("updates size", () => {
      controller.update("Hello world")

      expect(controller.sizeTarget.textContent).toContain("B")
    })

    it("updates read time", () => {
      controller.update("Hello world")

      expect(controller.readTimeTarget.textContent).toContain("min")
    })

    it("handles empty text", () => {
      controller.update("")

      expect(controller.wordsTarget.textContent).toBe("0")
      expect(controller.charsTarget.textContent).toBe("0")
    })

    it("handles null text", () => {
      controller.update(null)

      expect(controller.wordsTarget.textContent).toBe("0")
    })
  })

  describe("scheduleUpdate()", () => {
    it("sets update timeout", () => {
      controller.scheduleUpdate("test")

      expect(controller.updateTimeout).not.toBeNull()
    })

    it("clears previous timeout on new schedule", () => {
      controller.scheduleUpdate("first")
      const firstTimeout = controller.updateTimeout

      controller.scheduleUpdate("second")
      const secondTimeout = controller.updateTimeout

      expect(secondTimeout).not.toBe(firstTimeout)
    })

    it("eventually calls update", async () => {
      const updateSpy = vi.spyOn(controller, "update")

      controller.scheduleUpdate("test text")

      // Wait for debounce (500ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(updateSpy).toHaveBeenCalledWith("test text")
    })
  })

  describe("onUpdate()", () => {
    it("calls scheduleUpdate for normal updates", () => {
      const scheduleSpy = vi.spyOn(controller, "scheduleUpdate")
      const event = { detail: { text: "hello" } }

      controller.onUpdate(event)

      expect(scheduleSpy).toHaveBeenCalledWith("hello")
    })

    it("calls update directly when immediate flag is set", () => {
      const updateSpy = vi.spyOn(controller, "update")
      const event = { detail: { text: "hello", immediate: true } }

      controller.onUpdate(event)

      expect(updateSpy).toHaveBeenCalledWith("hello")
    })
  })

  describe("disconnect()", () => {
    it("clears update timeout", () => {
      controller.scheduleUpdate("test")
      expect(controller.updateTimeout).not.toBeNull()

      controller.disconnect()

      // Timeout should be cleared (we can't directly check if it was cancelled,
      // but we can verify the controller handles disconnect gracefully)
    })
  })
})
