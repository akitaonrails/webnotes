import { Controller } from "@hotwired/stimulus"
import { marked } from "marked"

// Preview Controller
// Handles markdown preview panel rendering, zoom, and scroll sync
// Dispatches preview:toggled and preview:zoom-changed events

export default class extends Controller {
  static targets = [
    "panel",
    "content",
    "zoomLevel"
  ]

  static values = {
    zoom: { type: Number, default: 100 },
    typewriterMode: { type: Boolean, default: false },
    syncScrollEnabled: { type: Boolean, default: true }
  }

  connect() {
    this.zoomLevels = [50, 75, 90, 100, 110, 125, 150, 175, 200]
    this.syncScrollTimeout = null
    this.applyZoom()
  }

  disconnect() {
    if (this.syncScrollTimeout) {
      cancelAnimationFrame(this.syncScrollTimeout)
    }
  }

  // Toggle preview panel visibility
  toggle() {
    if (!this.hasPanelTarget) return false

    const isHidden = this.panelTarget.classList.contains("hidden")
    this.panelTarget.classList.toggle("hidden", !isHidden)
    this.panelTarget.classList.toggle("flex", isHidden)
    document.body.classList.toggle("preview-visible", isHidden)

    this.dispatch("toggled", { detail: { visible: isHidden } })
    return isHidden // Returns true if now visible
  }

  // Show preview panel
  show() {
    if (!this.hasPanelTarget) return
    if (!this.panelTarget.classList.contains("hidden")) return

    this.panelTarget.classList.remove("hidden")
    this.panelTarget.classList.add("flex")
    document.body.classList.add("preview-visible")
    this.dispatch("toggled", { detail: { visible: true } })
  }

  // Hide preview panel
  hide() {
    if (!this.hasPanelTarget) return
    if (this.panelTarget.classList.contains("hidden")) return

    this.panelTarget.classList.add("hidden")
    this.panelTarget.classList.remove("flex")
    document.body.classList.remove("preview-visible")
    this.dispatch("toggled", { detail: { visible: false } })
  }

  // Check if preview is visible
  get isVisible() {
    return this.hasPanelTarget && !this.panelTarget.classList.contains("hidden")
  }

  // Render markdown content to preview
  render(markdownContent) {
    if (!this.isVisible) return
    if (!this.hasContentTarget) return

    this.contentTarget.innerHTML = marked.parse(markdownContent || "")
  }

  // Update preview with content and scroll sync
  update(markdownContent, scrollData = {}) {
    this.render(markdownContent)

    // Sync scroll after rendering
    if (scrollData.typewriterMode && scrollData.currentLine !== undefined) {
      this.syncToTypewriter(scrollData.currentLine, scrollData.totalLines)
    } else if (scrollData.scrollRatio !== undefined) {
      this.syncScrollRatio(scrollData.scrollRatio)
    }
  }

  // Zoom in
  zoomIn() {
    const currentIndex = this.zoomLevels.indexOf(this.zoomValue)
    if (currentIndex < this.zoomLevels.length - 1) {
      this.zoomValue = this.zoomLevels[currentIndex + 1]
      this.applyZoom()
      this.dispatch("zoom-changed", { detail: { zoom: this.zoomValue } })
    }
  }

  // Zoom out
  zoomOut() {
    const currentIndex = this.zoomLevels.indexOf(this.zoomValue)
    if (currentIndex > 0) {
      this.zoomValue = this.zoomLevels[currentIndex - 1]
      this.applyZoom()
      this.dispatch("zoom-changed", { detail: { zoom: this.zoomValue } })
    }
  }

  // Apply current zoom level to preview content
  applyZoom() {
    if (this.hasContentTarget) {
      this.contentTarget.style.fontSize = `${this.zoomValue}%`
    }
    if (this.hasZoomLevelTarget) {
      this.zoomLevelTarget.textContent = `${this.zoomValue}%`
    }
  }

  // Called when zoom value changes
  zoomValueChanged() {
    this.applyZoom()
  }

  // Sync scroll based on ratio (for normal scrolling)
  syncScrollRatio(scrollRatio) {
    if (!this.syncScrollEnabledValue) return
    if (!this.isVisible) return
    if (!this.hasContentTarget) return

    // Debounce to avoid excessive updates
    if (this.syncScrollTimeout) {
      cancelAnimationFrame(this.syncScrollTimeout)
    }

    this.syncScrollTimeout = requestAnimationFrame(() => {
      const preview = this.contentTarget
      const previewScrollHeight = preview.scrollHeight - preview.clientHeight

      if (previewScrollHeight > 0) {
        preview.scrollTop = scrollRatio * previewScrollHeight
      }
    })
  }

  // Sync scroll based on line position (for cursor-based sync)
  syncToLine(linesBefore, totalLines) {
    if (!this.syncScrollEnabledValue) return
    if (!this.isVisible) return
    if (!this.hasContentTarget) return
    if (totalLines <= 1) return

    const lineRatio = (linesBefore - 1) / (totalLines - 1)
    const preview = this.contentTarget
    const previewScrollHeight = preview.scrollHeight - preview.clientHeight

    if (previewScrollHeight > 0) {
      const targetScroll = lineRatio * previewScrollHeight

      preview.scrollTo({
        top: targetScroll,
        behavior: "smooth"
      })
    }
  }

  // Sync scroll in typewriter mode (center content)
  syncToTypewriter(currentLine, totalLines) {
    if (!this.hasContentTarget) return
    if (totalLines <= 1) return

    const preview = this.contentTarget
    const lineRatio = (currentLine - 1) / (totalLines - 1)

    // In typewriter mode, preview has bottom padding
    const style = window.getComputedStyle(preview)
    const paddingBottom = parseFloat(style.paddingBottom) || 0
    const actualContentHeight = preview.scrollHeight - paddingBottom

    // Position in the actual content based on line ratio
    const contentPosition = lineRatio * actualContentHeight

    // Center content at 50% of visible area
    const targetY = preview.clientHeight * 0.5
    const desiredScroll = contentPosition - targetY

    preview.scrollTop = Math.max(0, desiredScroll)
  }

  // Toggle typewriter mode styling on preview
  setTypewriterMode(enabled) {
    this.typewriterModeValue = enabled
    if (this.hasContentTarget) {
      this.contentTarget.classList.toggle("preview-typewriter-mode", enabled)
    }
  }
}
