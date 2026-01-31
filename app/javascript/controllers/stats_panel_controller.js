import { Controller } from "@hotwired/stimulus"
import { calculateStats, formatFileSize, formatReadTime } from "lib/stats_utils"

// Stats Panel Controller
// Displays document statistics: word count, character count, file size, read time
// Listens for stats:update events with text content

export default class extends Controller {
  static targets = [
    "panel",
    "words",
    "chars",
    "size",
    "readTime"
  ]

  connect() {
    this.updateTimeout = null
  }

  disconnect() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }
  }

  // Show the stats panel
  show() {
    if (this.hasPanelTarget) {
      this.panelTarget.classList.remove("hidden")
    }
  }

  // Hide the stats panel
  hide() {
    if (this.hasPanelTarget) {
      this.panelTarget.classList.add("hidden")
    }
  }

  // Schedule a debounced stats update
  scheduleUpdate(text) {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }
    this.updateTimeout = setTimeout(() => this.update(text), 500)
  }

  // Update stats display with text content
  update(text) {
    if (!this.hasPanelTarget) return

    const stats = calculateStats(text || "")

    if (this.hasWordsTarget) {
      this.wordsTarget.textContent = stats.wordCount.toLocaleString()
    }
    if (this.hasCharsTarget) {
      this.charsTarget.textContent = stats.charCount.toLocaleString()
    }
    if (this.hasSizeTarget) {
      this.sizeTarget.textContent = formatFileSize(stats.byteSize)
    }
    if (this.hasReadTimeTarget) {
      this.readTimeTarget.textContent = formatReadTime(stats.readTimeMinutes)
    }
  }

  // Handle update event from app controller
  onUpdate(event) {
    const { text, immediate } = event.detail || {}
    if (immediate) {
      this.update(text)
    } else {
      this.scheduleUpdate(text)
    }
  }
}
