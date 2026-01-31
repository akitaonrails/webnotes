import { Controller } from "@hotwired/stimulus"
import { escapeHtml } from "lib/text_utils"

// Content Search Controller
// Handles Ctrl+Shift+F content search dialog with regex support
// Dispatches content-search:selected event with path and line number

export default class extends Controller {
  static targets = [
    "dialog",
    "input",
    "results",
    "status"
  ]

  connect() {
    this.searchResultsData = []
    this.selectedIndex = 0
    this.searchTimeout = null
    this.usingKeyboard = false
  }

  open() {
    this.searchResultsData = []
    this.selectedIndex = 0
    this.inputTarget.value = ""
    this.resultsTarget.innerHTML = ""
    this.statusTarget.textContent = window.t("status.type_to_search_regex")
    this.dialogTarget.showModal()
    this.inputTarget.focus()
  }

  close() {
    this.dialogTarget.close()
  }

  onInput() {
    const query = this.inputTarget.value.trim()

    // Debounce search
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }

    if (!query) {
      this.searchResultsData = []
      this.resultsTarget.innerHTML = ""
      this.statusTarget.textContent = window.t("status.type_to_search_regex")
      return
    }

    this.statusTarget.textContent = window.t("status.searching")

    this.searchTimeout = setTimeout(async () => {
      await this.performSearch(query)
    }, 300)
  }

  async performSearch(query) {
    try {
      const response = await fetch(`/notes/search?q=${encodeURIComponent(query)}`, {
        headers: { "Accept": "application/json" }
      })

      if (!response.ok) {
        throw new Error(window.t("errors.search_failed"))
      }

      this.searchResultsData = await response.json()
      this.selectedIndex = 0
      this.renderResults()

      const count = this.searchResultsData.length
      const maxMsg = count >= 20 ? " (showing first 20)" : ""
      this.statusTarget.textContent = count === 0
        ? window.t("status.no_matches")
        : `${count} match${count === 1 ? "" : "es"} found${maxMsg} - use ↑↓ to navigate, Enter to open`
    } catch (error) {
      console.error("Search error:", error)
      this.statusTarget.textContent = window.t("status.search_error")
      this.resultsTarget.innerHTML = ""
    }
  }

  renderResults() {
    if (this.searchResultsData.length === 0) {
      this.resultsTarget.innerHTML = `
        <div class="px-4 py-8 text-center text-[var(--theme-text-muted)] text-sm">
          ${window.t("status.no_matches")}
        </div>
      `
      return
    }

    this.resultsTarget.innerHTML = this.searchResultsData
      .map((result, index) => {
        const isSelected = index === this.selectedIndex
        const contextHtml = result.context.map(line => {
          const lineClass = line.is_match
            ? "bg-[var(--theme-selection)] text-[var(--theme-selection-text)]"
            : ""
          const escapedContent = escapeHtml(line.content)
          return `<div class="flex ${lineClass}">
            <span class="w-10 flex-shrink-0 text-right pr-2 text-[var(--theme-text-faint)] select-none">${line.line_number}</span>
            <span class="flex-1 overflow-hidden text-ellipsis">${escapedContent}</span>
          </div>`
        }).join("")

        const selectedClass = isSelected
          ? 'bg-[var(--theme-accent)] text-[var(--theme-accent-text)]'
          : 'hover:bg-[var(--theme-bg-hover)]'

        return `
          <button
            type="button"
            class="w-full text-left border-b border-[var(--theme-border)] last:border-b-0 ${selectedClass}"
            data-index="${index}"
            data-path="${escapeHtml(result.path)}"
            data-line="${result.line_number}"
            data-action="click->content-search#selectFromClick mouseenter->content-search#onHover"
          >
            <div class="px-3 py-2">
              <div class="flex items-center gap-2 mb-1">
                <svg class="w-4 h-4 flex-shrink-0 ${isSelected ? '' : 'text-[var(--theme-text-muted)]'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span class="font-medium truncate">${escapeHtml(result.name)}</span>
                <span class="text-xs ${isSelected ? 'opacity-80' : 'text-[var(--theme-text-muted)]'}">:${result.line_number}</span>
                <span class="text-xs ${isSelected ? 'opacity-70' : 'text-[var(--theme-text-faint)]'} truncate ml-auto">${escapeHtml(result.path.replace(/\.md$/, ""))}</span>
              </div>
              <div class="font-mono text-xs leading-relaxed overflow-hidden ${isSelected ? 'bg-black/20' : 'bg-[var(--theme-bg-tertiary)]'} rounded p-2">
                ${contextHtml}
              </div>
            </div>
          </button>
        `
      })
      .join("")
  }

  onKeydown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      this.usingKeyboard = true
      if (this.selectedIndex < this.searchResultsData.length - 1) {
        this.selectedIndex++
        this.renderResults()
        this.scrollIntoView()
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      this.usingKeyboard = true
      if (this.selectedIndex > 0) {
        this.selectedIndex--
        this.renderResults()
        this.scrollIntoView()
      }
    } else if (event.key === "Enter") {
      event.preventDefault()
      this.selectCurrent()
    }
  }

  scrollIntoView() {
    const selected = this.resultsTarget.querySelector(`[data-index="${this.selectedIndex}"]`)
    if (selected) {
      selected.scrollIntoView({ block: "nearest" })
    }
  }

  onHover(event) {
    // Ignore hover events when navigating with keyboard
    if (this.usingKeyboard) return

    const index = parseInt(event.currentTarget.dataset.index)
    if (index !== this.selectedIndex) {
      this.selectedIndex = index
      this.renderResults()
    }
  }

  onMouseMove() {
    // Re-enable mouse selection when mouse moves
    this.usingKeyboard = false
  }

  selectFromClick(event) {
    const path = event.currentTarget.dataset.path
    const line = parseInt(event.currentTarget.dataset.line)
    this.dispatchSelected(path, line)
  }

  selectCurrent() {
    if (this.searchResultsData.length === 0) return
    const result = this.searchResultsData[this.selectedIndex]
    if (result) {
      this.dispatchSelected(result.path, result.line_number)
    }
  }

  dispatchSelected(path, lineNumber) {
    this.dispatch("selected", { detail: { path, lineNumber } })
    this.close()
  }
}
