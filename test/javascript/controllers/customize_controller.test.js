/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import CustomizeController from "../../../app/javascript/controllers/customize_controller.js"

describe("CustomizeController", () => {
  let application, controller, element

  beforeEach(() => {
    document.body.innerHTML = `
      <div data-controller="customize" data-customize-font-value="cascadia-code" data-customize-font-size-value="14">
        <dialog data-customize-target="dialog"></dialog>
        <select data-customize-target="fontSelect">
          <option value="cascadia-code">Cascadia Code</option>
          <option value="fira-code">Fira Code</option>
          <option value="jetbrains-mono">JetBrains Mono</option>
        </select>
        <select data-customize-target="fontSizeSelect">
          <option value="12">12px</option>
          <option value="14">14px</option>
          <option value="16">16px</option>
        </select>
        <div data-customize-target="preview" style="font-family: monospace; font-size: 14px;"></div>
      </div>
    `

    // Mock showModal and close for dialog
    HTMLDialogElement.prototype.showModal = vi.fn(function () {
      this.open = true
    })
    HTMLDialogElement.prototype.close = vi.fn(function () {
      this.open = false
    })

    element = document.querySelector('[data-controller="customize"]')
    application = Application.start()
    application.register("customize", CustomizeController)

    return new Promise((resolve) => {
      setTimeout(() => {
        controller = application.getControllerForElementAndIdentifier(element, "customize")
        resolve()
      }, 0)
    })
  })

  afterEach(() => {
    application.stop()
    vi.restoreAllMocks()
  })

  describe("connect()", () => {
    it("initializes fonts array", () => {
      expect(controller.fonts).toHaveLength(9)
      expect(controller.fonts[0].id).toBe("cascadia-code")
    })

    it("initializes font sizes array", () => {
      expect(controller.fontSizes).toEqual([12, 13, 14, 15, 16, 18, 20, 22, 24])
    })

    it("loads initial values from data attributes", () => {
      expect(controller.fontValue).toBe("cascadia-code")
      expect(controller.fontSizeValue).toBe(14)
    })
  })

  describe("open()", () => {
    it("shows the dialog", () => {
      controller.open()

      expect(controller.dialogTarget.showModal).toHaveBeenCalled()
    })

    it("sets font select to provided value", () => {
      controller.open("fira-code", 16)

      expect(controller.fontSelectTarget.value).toBe("fira-code")
    })

    it("uses stored values when no arguments provided", () => {
      controller.fontValue = "jetbrains-mono"
      controller.open()

      expect(controller.fontSelectTarget.value).toBe("jetbrains-mono")
    })

    it("updates preview on open", () => {
      const updateSpy = vi.spyOn(controller, "updatePreview")
      controller.open()

      expect(updateSpy).toHaveBeenCalled()
    })
  })

  describe("close()", () => {
    it("closes the dialog", () => {
      controller.open()
      controller.close()

      expect(controller.dialogTarget.close).toHaveBeenCalled()
    })
  })

  describe("onFontChange()", () => {
    it("updates preview when font changes", () => {
      const updateSpy = vi.spyOn(controller, "updatePreview")
      controller.fontSelectTarget.value = "fira-code"

      controller.onFontChange()

      expect(updateSpy).toHaveBeenCalled()
    })
  })

  describe("onFontSizeChange()", () => {
    it("updates preview when font size changes", () => {
      const updateSpy = vi.spyOn(controller, "updatePreview")
      controller.fontSizeSelectTarget.value = "16"

      controller.onFontSizeChange()

      expect(updateSpy).toHaveBeenCalled()
    })
  })

  describe("updatePreview()", () => {
    it("applies font family to preview", () => {
      controller.fontSelectTarget.value = "fira-code"
      controller.updatePreview()

      // Browser may normalize quotes (single to double)
      expect(controller.previewTarget.style.fontFamily).toContain("Fira Code")
      expect(controller.previewTarget.style.fontFamily).toContain("monospace")
    })

    it("applies font size to preview", () => {
      controller.fontSizeSelectTarget.value = "16"
      controller.updatePreview()

      expect(controller.previewTarget.style.fontSize).toBe("16px")
    })
  })

  describe("apply()", () => {
    it("dispatches applied event with settings", () => {
      const handler = vi.fn()
      element.addEventListener("customize:applied", handler)

      controller.fontSelectTarget.value = "fira-code"
      controller.fontSizeSelectTarget.value = "16"
      controller.apply()

      expect(handler).toHaveBeenCalled()
      const detail = handler.mock.calls[0][0].detail
      expect(detail.font).toBe("fira-code")
      expect(detail.fontSize).toBe(16)
      expect(detail.fontFamily).toBe("'Fira Code', monospace")
    })

    it("updates stored values", () => {
      controller.fontSelectTarget.value = "jetbrains-mono"
      controller.fontSizeSelectTarget.value = "16"
      controller.apply()

      expect(controller.fontValue).toBe("jetbrains-mono")
      expect(controller.fontSizeValue).toBe(16)
    })

    it("closes the dialog", () => {
      controller.open()
      controller.apply()

      expect(controller.dialogTarget.close).toHaveBeenCalled()
    })
  })

  describe("getFontFamily()", () => {
    it("returns font family for valid font id", () => {
      const family = controller.getFontFamily("cascadia-code")
      expect(family).toBe("'Cascadia Code', monospace")
    })

    it("returns null for unknown font id", () => {
      const family = controller.getFontFamily("unknown-font")
      expect(family).toBeNull()
    })
  })
})
