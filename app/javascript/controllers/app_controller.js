import { Controller } from "@hotwired/stimulus"
import { marked } from "marked"
import { escapeHtml } from "lib/text_utils"
import { findTableAtPosition, findCodeBlockAtPosition } from "lib/markdown_utils"
import { encodePath } from "lib/url_utils"
import { flattenTree } from "lib/tree_utils"

export default class extends Controller {
  static targets = [
    "fileTree",
    "editorPlaceholder",
    "editor",
    "textarea",
    "currentPath",
    "saveStatus",
    "contextMenu",
    "editorToolbar",
    "helpDialog",
    "tableHint",
    "sidebar",
    "sidebarToggle",
    "aiButton"
  ]

  static values = {
    tree: Array,
    initialPath: String,
    initialNote: Object,
    config: Object
  }

  connect() {
    this.currentFile = null
    this.currentFileType = null  // "markdown", "config", or null
    this.expandedFolders = new Set()
    this.saveTimeout = null

    // Editor customization - fonts in alphabetical order, Cascadia Code as default
    this.editorFonts = [
      { id: "cascadia-code", name: "Cascadia Code", family: "'Cascadia Code', monospace" },
      { id: "consolas", name: "Consolas", family: "Consolas, monospace" },
      { id: "dejavu-mono", name: "DejaVu Sans Mono", family: "'DejaVu Mono', monospace" },
      { id: "fira-code", name: "Fira Code", family: "'Fira Code', monospace" },
      { id: "hack", name: "Hack", family: "Hack, monospace" },
      { id: "jetbrains-mono", name: "JetBrains Mono", family: "'JetBrains Mono', monospace" },
      { id: "roboto-mono", name: "Roboto Mono", family: "'Roboto Mono', monospace" },
      { id: "source-code-pro", name: "Source Code Pro", family: "'Source Code Pro', monospace" },
      { id: "ubuntu-mono", name: "Ubuntu Mono", family: "'Ubuntu Mono', monospace" }
    ]
    this.editorFontSizes = [12, 13, 14, 15, 16, 18, 20, 22, 24]

    // Load settings from server config (falls back to defaults if not available)
    const settings = this.hasConfigValue ? (this.configValue.settings || {}) : {}
    this.currentFont = settings.editor_font || "cascadia-code"
    this.currentFontSize = parseInt(settings.editor_font_size) || 14

    // Preview zoom (tracked for config saving, actual state in preview controller)
    this.previewZoom = parseInt(settings.preview_zoom) || 100

    // Sidebar/Explorer visibility
    this.sidebarVisible = settings.sidebar_visible !== false

    // Typewriter mode - focused writing mode
    this.typewriterModeEnabled = settings.typewriter_mode === true

    // Track pending config saves to debounce
    this.configSaveTimeout = null

    // Sync scroll enabled flag
    this.syncScrollEnabled = true

    this.renderTree()
    this.setupKeyboardShortcuts()
    this.setupDialogClickOutside()
    this.setupSyncScroll()
    this.applyEditorSettings()
    this.applyPreviewZoom()
    this.applySidebarVisibility()
    this.applyTypewriterMode()
    this.setupConfigFileListener()
    this.setupTableEditorListener()

    // Configure marked
    marked.setOptions({
      breaks: true,
      gfm: true
    })

    // Handle initial file from URL (bookmarkable URLs)
    this.handleInitialFile()

    // Setup browser history handling for back/forward buttons
    this.setupHistoryHandling()
  }

  disconnect() {
    // Clear all timeouts
    if (this.saveTimeout) clearTimeout(this.saveTimeout)
    if (this.configSaveTimeout) clearTimeout(this.configSaveTimeout)

    // Remove window/document event listeners
    if (this.boundPopstateHandler) {
      window.removeEventListener("popstate", this.boundPopstateHandler)
    }
    if (this.boundTableInsertHandler) {
      window.removeEventListener("frankmd:insert-table", this.boundTableInsertHandler)
    }
    if (this.boundConfigFileHandler) {
      window.removeEventListener("frankmd:config-file-modified", this.boundConfigFileHandler)
    }
    if (this.boundKeydownHandler) {
      document.removeEventListener("keydown", this.boundKeydownHandler)
    }

    // Clean up object URLs to prevent memory leaks
    this.cleanupLocalFolderImages()

    // Abort any pending AI requests
    if (this.aiImageAbortController) {
      this.aiImageAbortController.abort()
    }
  }

  // URL Management for Bookmarkable URLs

  handleInitialFile() {
    // Check if server provided initial note data (from URL like /notes/path/to/file.md)
    if (this.hasInitialNoteValue && this.initialNoteValue) {
      const { path, content, exists, error } = this.initialNoteValue

      if (exists && content !== null) {
        // File exists - load it directly from server-provided data
        this.currentFile = path
        const fileType = this.getFileType(path)
        this.currentPathTarget.textContent = fileType === "markdown"
          ? path.replace(/\.md$/, "")
          : path
        this.expandParentFolders(path)
        this.showEditor(content, fileType)
        this.renderTree()
        return
      }

      if (!exists) {
        // File was requested but doesn't exist
        this.showFileNotFoundMessage(path, error || window.t("errors.file_not_found"))
        // Update URL to root without adding history entry
        this.updateUrl(null, { replace: true })
        return
      }
    }

    // Fallback: Check URL path directly (shouldn't normally happen if server is handling it)
    const urlPath = this.getFilePathFromUrl()
    if (urlPath) {
      this.loadFile(urlPath)
    }
  }

  getFilePathFromUrl() {
    const path = window.location.pathname
    const match = path.match(/^\/notes\/(.+\.md)$/)
    if (match) {
      return decodeURIComponent(match[1])
    }

    // Also check query param ?file=
    const params = new URLSearchParams(window.location.search)
    return params.get("file")
  }

  updateUrl(path, options = {}) {
    const { replace = false } = options
    const newUrl = path ? `/notes/${encodePath(path)}` : "/"

    if (window.location.pathname !== newUrl) {
      if (replace) {
        window.history.replaceState({ file: path }, "", newUrl)
      } else {
        window.history.pushState({ file: path }, "", newUrl)
      }
    }
  }

  setupHistoryHandling() {
    this.boundPopstateHandler = async (event) => {
      const path = event.state?.file || this.getFilePathFromUrl()

      if (path) {
        await this.loadFile(path, { updateHistory: false })
      } else {
        // No file - show placeholder
        this.currentFile = null
        this.currentPathTarget.textContent = window.t("editor.select_note")
        this.editorPlaceholderTarget.classList.remove("hidden")
        this.editorTarget.classList.add("hidden")
        this.editorToolbarTarget.classList.add("hidden")
        this.editorToolbarTarget.classList.remove("flex")
        this.hideStatsPanel()
        this.renderTree()
      }
    }
    window.addEventListener("popstate", this.boundPopstateHandler)
  }

  expandParentFolders(path) {
    const parts = path.split("/")
    let expandPath = ""

    for (let i = 0; i < parts.length - 1; i++) {
      expandPath = expandPath ? `${expandPath}/${parts[i]}` : parts[i]
      this.expandedFolders.add(expandPath)
    }
  }

  showFileNotFoundMessage(path, message) {
    this.editorPlaceholderTarget.classList.add("hidden")
    this.editorTarget.classList.remove("hidden")
    this.editorToolbarTarget.classList.add("hidden")
    this.editorToolbarTarget.classList.remove("flex")

    this.textareaTarget.value = ""
    this.textareaTarget.disabled = true

    this.currentPathTarget.innerHTML = `
      <span class="text-red-500">${escapeHtml(path)}</span>
      <span class="text-[var(--theme-text-muted)] ml-2">(${escapeHtml(message)})</span>
    `

    // Clear after a moment and return to normal state
    setTimeout(() => {
      this.textareaTarget.disabled = false
      this.currentPathTarget.textContent = window.t("editor.select_note")
      this.editorPlaceholderTarget.classList.remove("hidden")
      this.editorTarget.classList.add("hidden")
      this.hideStatsPanel()
    }, 5000)
  }

  // Tree Rendering
  renderTree() {
    this.fileTreeTarget.innerHTML = this.buildTreeHTML(this.treeValue)
  }

  buildTreeHTML(items, depth = 0) {
    if (!items || items.length === 0) {
      if (depth === 0) {
        return `<div class="text-sm text-[var(--theme-text-muted)] p-2">${window.t("sidebar.no_notes_yet")}</div>`
      }
      return ""
    }

    return items.map(item => {
      if (item.type === "folder") {
        const isExpanded = this.expandedFolders.has(item.path)
        return `
          <div class="tree-folder" data-path="${escapeHtml(item.path)}">
            <div class="tree-item drop-target" draggable="true"
              data-action="click->app#toggleFolder contextmenu->app#showContextMenu dragstart->app#onDragStart dragover->app#onDragOver dragenter->app#onDragEnter dragleave->app#onDragLeave drop->app#onDrop dragend->app#onDragEnd"
              data-path="${escapeHtml(item.path)}" data-type="folder">
              <svg class="tree-chevron ${isExpanded ? 'expanded' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <svg class="tree-icon text-[var(--theme-folder-icon)]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span class="truncate">${escapeHtml(item.name)}</span>
            </div>
            <div class="tree-children ${isExpanded ? '' : 'hidden'}">
              ${this.buildTreeHTML(item.children, depth + 1)}
            </div>
          </div>
        `
      } else {
        const isSelected = this.currentFile === item.path
        const isConfig = item.file_type === "config"
        const icon = isConfig
          ? `<svg class="tree-icon text-[var(--theme-config-icon)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>`
          : `<svg class="tree-icon text-[var(--theme-file-icon)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>`
        // Config files should not be draggable or have context menu
        const dragAttrs = isConfig ? '' : 'draggable="true" data-action="click->app#selectFile contextmenu->app#showContextMenu dragstart->app#onDragStart dragend->app#onDragEnd"'
        const clickAction = isConfig ? 'data-action="click->app#selectFile"' : ''
        return `
          <div class="tree-item ${isSelected ? 'selected' : ''}" ${isConfig ? clickAction : dragAttrs}
            data-path="${escapeHtml(item.path)}" data-type="file" data-file-type="${item.file_type || 'markdown'}">
            ${icon}
            <span class="truncate">${escapeHtml(item.name)}</span>
          </div>
        `
      }
    }).join("")
  }

  toggleFolder(event) {
    const path = event.currentTarget.dataset.path
    const folderEl = event.currentTarget.closest(".tree-folder")
    const children = folderEl.querySelector(".tree-children")
    const chevron = event.currentTarget.querySelector(".tree-chevron")

    if (this.expandedFolders.has(path)) {
      this.expandedFolders.delete(path)
      children.classList.add("hidden")
      chevron.classList.remove("expanded")
    } else {
      this.expandedFolders.add(path)
      children.classList.remove("hidden")
      chevron.classList.add("expanded")
    }
  }

  // Drag and Drop
  onDragStart(event) {
    const target = event.currentTarget
    this.draggedItem = {
      path: target.dataset.path,
      type: target.dataset.type
    }
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", target.dataset.path)
    target.classList.add("dragging")

    // Add a slight delay to show the dragging state
    setTimeout(() => {
      target.classList.add("drag-ghost")
    }, 0)
  }

  onDragEnd(event) {
    event.currentTarget.classList.remove("dragging", "drag-ghost")
    this.draggedItem = null

    // Remove all drop highlights
    this.fileTreeTarget.querySelectorAll(".drop-highlight").forEach(el => {
      el.classList.remove("drop-highlight")
    })
    this.fileTreeTarget.classList.remove("drop-highlight-root")
  }

  onDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }

  onDragEnter(event) {
    event.preventDefault()
    const target = event.currentTarget

    if (!this.draggedItem) return

    // Don't allow dropping on itself or its children
    if (this.draggedItem.path === target.dataset.path) return
    if (target.dataset.path.startsWith(this.draggedItem.path + "/")) return

    // Only folders are valid drop targets
    if (target.dataset.type === "folder") {
      target.classList.add("drop-highlight")
    }
  }

  onDragLeave(event) {
    const target = event.currentTarget
    // Check if we're actually leaving the element (not just entering a child)
    const rect = target.getBoundingClientRect()
    const x = event.clientX
    const y = event.clientY

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      target.classList.remove("drop-highlight")
    }
  }

  async onDrop(event) {
    event.preventDefault()
    event.stopPropagation()

    const target = event.currentTarget
    target.classList.remove("drop-highlight")

    if (!this.draggedItem) return
    if (target.dataset.type !== "folder") return

    const sourcePath = this.draggedItem.path
    const targetFolder = target.dataset.path

    // Don't drop on itself or its parent
    if (sourcePath === targetFolder) return
    if (sourcePath.startsWith(targetFolder + "/")) return

    // Get the item name
    const itemName = sourcePath.split("/").pop()
    const newPath = `${targetFolder}/${itemName}`

    // Don't move to same location
    const currentParent = sourcePath.split("/").slice(0, -1).join("/")
    if (currentParent === targetFolder) return

    await this.moveItem(sourcePath, newPath, this.draggedItem.type)
  }

  onDragOverRoot(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }

  onDragEnterRoot(event) {
    event.preventDefault()
    if (!this.draggedItem) return

    // Only highlight if the item is not already at root
    if (this.draggedItem.path.includes("/")) {
      this.fileTreeTarget.classList.add("drop-highlight-root")
    }
  }

  onDragLeaveRoot(event) {
    // Only remove highlight if we're leaving the file tree entirely
    const rect = this.fileTreeTarget.getBoundingClientRect()
    const x = event.clientX
    const y = event.clientY

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this.fileTreeTarget.classList.remove("drop-highlight-root")
    }
  }

  async onDropToRoot(event) {
    event.preventDefault()
    event.stopPropagation()

    this.fileTreeTarget.classList.remove("drop-highlight-root")

    if (!this.draggedItem) return

    const sourcePath = this.draggedItem.path

    // If already at root, do nothing
    if (!sourcePath.includes("/")) return

    const itemName = sourcePath.split("/").pop()
    const newPath = itemName

    await this.moveItem(sourcePath, newPath, this.draggedItem.type)
  }

  async moveItem(oldPath, newPath, type) {
    try {
      const endpoint = type === "file" ? "notes" : "folders"
      const response = await fetch(`/${endpoint}/${encodePath(oldPath)}/rename`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfToken
        },
        body: JSON.stringify({ new_path: newPath })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || window.t("errors.failed_to_move"))
      }

      // Update current file reference if it was moved
      if (this.currentFile === oldPath) {
        this.currentFile = newPath
        this.currentPathTarget.textContent = newPath.replace(/\.md$/, "")
      } else if (type === "folder" && this.currentFile && this.currentFile.startsWith(oldPath + "/")) {
        // If a folder containing the current file was moved
        this.currentFile = this.currentFile.replace(oldPath, newPath)
        this.currentPathTarget.textContent = this.currentFile.replace(/\.md$/, "")
      }

      // Expand the target folder
      const targetFolder = newPath.split("/").slice(0, -1).join("/")
      if (targetFolder) {
        this.expandedFolders.add(targetFolder)
      }

      await this.refreshTree()
    } catch (error) {
      console.error("Error moving item:", error)
      alert(error.message)
    }
  }

  // File Selection and Editor
  async selectFile(event) {
    const path = event.currentTarget.dataset.path
    await this.loadFile(path)
  }

  async loadFile(path, options = {}) {
    const { updateHistory = true } = options

    try {
      const response = await fetch(`/notes/${encodePath(path)}`, {
        headers: { "Accept": "application/json" }
      })

      if (!response.ok) {
        if (response.status === 404) {
          this.showFileNotFoundMessage(path, window.t("errors.note_not_found"))
          if (updateHistory) {
            this.updateUrl(null)
          }
          return
        }
        throw new Error(window.t("errors.failed_to_load"))
      }

      const data = await response.json()
      this.currentFile = path
      const fileType = this.getFileType(path)

      // Display path (don't strip extension for non-markdown files)
      this.currentPathTarget.textContent = fileType === "markdown"
        ? path.replace(/\.md$/, "")
        : path

      // Expand parent folders in tree
      this.expandParentFolders(path)

      this.showEditor(data.content, fileType)
      this.renderTree()

      // Update URL for bookmarkability
      if (updateHistory) {
        this.updateUrl(path)
      }
    } catch (error) {
      console.error("Error loading file:", error)
      this.showSaveStatus(window.t("status.error_loading"), true)
    }
  }

  showEditor(content, fileType = "markdown") {
    this.currentFileType = fileType
    this.editorPlaceholderTarget.classList.add("hidden")
    this.editorTarget.classList.remove("hidden")
    this.textareaTarget.value = content
    this.textareaTarget.focus()

    // Only show toolbar and preview for markdown files
    const isMarkdown = fileType === "markdown"

    if (isMarkdown) {
      this.editorToolbarTarget.classList.remove("hidden")
      this.editorToolbarTarget.classList.add("flex")
      this.updatePreview()
    } else {
      this.editorToolbarTarget.classList.add("hidden")
      this.editorToolbarTarget.classList.remove("flex")
      // Hide preview for non-markdown files
      const previewController = this.getPreviewController()
      if (previewController && previewController.isVisible) {
        previewController.hide()
      }
    }

    // Show stats panel and update stats
    this.showStatsPanel()
    this.updateStats()
  }

  // Check if current file is markdown
  isMarkdownFile() {
    return this.currentFileType === "markdown"
  }

  // Get file type from path
  getFileType(path) {
    if (!path) return null
    if (path === ".fed") return "config"
    if (path.endsWith(".md")) return "markdown"
    return "text"
  }

  onTextareaInput() {
    this.scheduleAutoSave()
    this.scheduleStatsUpdate()

    // Only do markdown-specific processing for markdown files
    if (this.isMarkdownFile()) {
      this.updatePreview()
      this.checkTableAtCursor()
      this.maintainTypewriterScroll()
    }
  }

  // Check if cursor is in a markdown table
  checkTableAtCursor() {
    if (!this.hasTextareaTarget) return

    const text = this.textareaTarget.value
    const cursorPos = this.textareaTarget.selectionStart
    const tableInfo = findTableAtPosition(text, cursorPos)

    if (tableInfo) {
      this.tableHintTarget.classList.remove("hidden")
    } else {
      this.tableHintTarget.classList.add("hidden")
    }
  }

  scheduleAutoSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
    this.showSaveStatus(window.t("status.unsaved"))
    this.saveTimeout = setTimeout(() => this.saveNow(), 1000)
  }

  async saveNow() {
    if (!this.currentFile || !this.hasTextareaTarget) return

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }

    const content = this.textareaTarget.value
    const isConfigFile = this.currentFile === ".fed"

    try {
      const response = await fetch(`/notes/${encodePath(this.currentFile)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfToken
        },
        body: JSON.stringify({ content })
      })

      if (!response.ok) {
        throw new Error(window.t("errors.failed_to_save"))
      }

      this.showSaveStatus(window.t("status.saved"))
      setTimeout(() => this.showSaveStatus(""), 2000)

      // If config file was saved, reload the configuration
      if (isConfigFile) {
        await this.reloadConfig()
      }
    } catch (error) {
      console.error("Error saving:", error)
      this.showSaveStatus(window.t("status.error_saving"), true)
    }
  }

  // Reload configuration from server and apply changes
  async reloadConfig() {
    try {
      const response = await fetch("/config", {
        headers: { "Accept": "application/json" }
      })

      if (!response.ok) {
        console.warn("Failed to reload config")
        return
      }

      const data = await response.json()
      const settings = data.settings || {}

      // Apply UI settings
      const oldFont = this.currentFont
      const oldFontSize = this.currentFontSize
      const oldZoom = this.previewZoom

      this.currentFont = settings.editor_font || "cascadia-code"
      this.currentFontSize = parseInt(settings.editor_font_size) || 14
      this.previewZoom = parseInt(settings.preview_zoom) || 100

      // Apply changes if they differ
      if (this.currentFont !== oldFont || this.currentFontSize !== oldFontSize) {
        this.applyEditorSettings()
      }
      if (this.previewZoom !== oldZoom) {
        const previewController = this.getPreviewController()
        if (previewController) {
          previewController.zoomValue = this.previewZoom
        }
      }

      // Notify theme controller to reload (dispatch custom event)
      const themeChanged = settings.theme
      if (themeChanged) {
        window.dispatchEvent(new CustomEvent("frankmd:config-changed", {
          detail: { theme: settings.theme }
        }))
      }

      this.showSaveStatus(window.t("status.config_applied"))
      setTimeout(() => this.showSaveStatus(""), 2000)
    } catch (error) {
      console.warn("Error reloading config:", error)
    }
  }

  showSaveStatus(text, isError = false) {
    this.saveStatusTarget.textContent = text
    this.saveStatusTarget.classList.toggle("hidden", !text)
    this.saveStatusTarget.classList.toggle("text-red-500", isError)
    this.saveStatusTarget.classList.toggle("dark:text-red-400", isError)
  }

  // Preview Panel - Delegates to preview_controller
  togglePreview() {
    // Only allow preview for markdown files
    if (!this.isMarkdownFile()) {
      this.showTemporaryMessage("Preview is only available for markdown files")
      return
    }

    const previewController = this.getPreviewController()
    if (previewController) {
      previewController.toggle()
    }
  }

  // Get the preview controller instance
  getPreviewController() {
    const previewElement = document.querySelector('[data-controller~="preview"]')
    if (previewElement) {
      return this.application.getControllerForElementAndIdentifier(previewElement, "preview")
    }
    return null
  }

  updatePreview() {
    const previewController = this.getPreviewController()
    if (!previewController || !previewController.isVisible) return
    if (!this.hasTextareaTarget) return

    const content = this.textareaTarget.value

    // Build scroll data for preview controller
    const scrollData = { typewriterMode: this.typewriterModeEnabled }

    if (this.typewriterModeEnabled) {
      const textBeforeCursor = content.substring(0, this.textareaTarget.selectionStart)
      scrollData.currentLine = textBeforeCursor.split("\n").length
      scrollData.totalLines = content.split("\n").length
    }

    previewController.update(content, scrollData)
  }

  setupSyncScroll() {
    if (!this.hasTextareaTarget) return

    // Listen for scroll events on the textarea (only sync preview if not in typewriter mode)
    this.textareaTarget.addEventListener("scroll", () => {
      if (!this.typewriterModeEnabled) {
        this.syncPreviewScroll()
      }
    })

    // Also sync on cursor position changes (selection change)
    this.textareaTarget.addEventListener("click", () => {
      if (this.typewriterModeEnabled) {
        this.maintainTypewriterScroll()
      } else {
        this.syncPreviewScrollToCursor()
      }
    })

    this.textareaTarget.addEventListener("keyup", (event) => {
      // Sync on arrow keys, page up/down, home/end
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) {
        if (this.typewriterModeEnabled) {
          this.maintainTypewriterScroll()
        } else {
          this.syncPreviewScrollToCursor()
        }
      }
    })
  }

  syncPreviewScroll() {
    if (!this.syncScrollEnabled) return
    if (!this.hasTextareaTarget) return

    const previewController = this.getPreviewController()
    if (!previewController || !previewController.isVisible) return

    const textarea = this.textareaTarget
    const scrollTop = textarea.scrollTop
    const scrollHeight = textarea.scrollHeight - textarea.clientHeight

    if (scrollHeight <= 0) return

    const scrollRatio = scrollTop / scrollHeight
    previewController.syncScrollRatio(scrollRatio)
  }

  syncPreviewScrollToCursor() {
    if (!this.syncScrollEnabled) return
    if (!this.hasTextareaTarget) return

    const previewController = this.getPreviewController()
    if (!previewController || !previewController.isVisible) return

    const textarea = this.textareaTarget
    const content = textarea.value
    const cursorPos = textarea.selectionStart

    const textBeforeCursor = content.substring(0, cursorPos)
    const linesBefore = textBeforeCursor.split("\n").length
    const totalLines = content.split("\n").length

    previewController.syncToLine(linesBefore, totalLines)
  }

  // Table Editor - dispatches event for table_editor_controller to handle
  openTableEditor() {
    let existingTable = null
    let startPos = 0
    let endPos = 0

    // Check if cursor is in existing table
    if (this.hasTextareaTarget) {
      const text = this.textareaTarget.value
      const cursorPos = this.textareaTarget.selectionStart
      const tableInfo = findTableAtPosition(text, cursorPos)

      if (tableInfo) {
        existingTable = tableInfo.lines.join("\n")
        startPos = tableInfo.startPos
        endPos = tableInfo.endPos
      }
    }

    // Dispatch event for table_editor_controller
    window.dispatchEvent(new CustomEvent("frankmd:open-table-editor", {
      detail: { existingTable, startPos, endPos }
    }))
  }

  // Setup listener for table insertion from table_editor_controller
  setupTableEditorListener() {
    this.boundTableInsertHandler = this.handleTableInsert.bind(this)
    window.addEventListener("frankmd:insert-table", this.boundTableInsertHandler)
  }

  // Handle table insertion from table_editor_controller
  handleTableInsert(event) {
    const { markdown, editMode, startPos, endPos } = event.detail

    if (!this.hasTextareaTarget || !markdown) return

    const textarea = this.textareaTarget
    const text = textarea.value

    if (editMode) {
      // Replace existing table
      const before = text.substring(0, startPos)
      const after = text.substring(endPos)
      textarea.value = before + markdown + after

      // Position cursor after table
      const newPos = startPos + markdown.length
      textarea.setSelectionRange(newPos, newPos)
    } else {
      // Insert at cursor
      const cursorPos = textarea.selectionStart
      const before = text.substring(0, cursorPos)
      const after = text.substring(cursorPos)

      // Add newlines if needed
      const prefix = before.length > 0 && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : ""
      const suffix = after.length > 0 && !after.startsWith("\n\n") ? (after.startsWith("\n") ? "\n" : "\n\n") : ""

      textarea.value = before + prefix + markdown + suffix + after

      // Position cursor after table
      const newPos = before.length + prefix.length + markdown.length
      textarea.setSelectionRange(newPos, newPos)
    }

    textarea.focus()
    this.scheduleAutoSave()
    this.updatePreview()
  }

  // Image Picker Event Handler - receives events from image_picker_controller
  onImageSelected(event) {
    const { markdown } = event.detail
    if (!markdown || !this.hasTextareaTarget) return

    const textarea = this.textareaTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value

    // Insert markdown at cursor position
    const before = text.substring(0, start)
    const after = text.substring(end)

    // Add newlines if needed
    const needsNewlineBefore = before.length > 0 && !before.endsWith("\n")
    const needsNewlineAfter = after.length > 0 && !after.startsWith("\n")

    const insert = (needsNewlineBefore ? "\n" : "") + markdown + (needsNewlineAfter ? "\n" : "")
    textarea.value = before + insert + after

    // Position cursor after inserted markdown
    const newPosition = start + insert.length
    textarea.setSelectionRange(newPosition, newPosition)
    textarea.focus()

    this.scheduleAutoSave()
    this.updatePreview()
  }

  // Open image picker dialog (delegates to image-picker controller)
  openImagePicker() {
    // Find and open the image picker controller's dialog
    const imagePickerElement = document.querySelector('[data-controller~="image-picker"]')
    if (imagePickerElement) {
      const imagePickerController = this.application.getControllerForElementAndIdentifier(
        imagePickerElement,
        "image-picker"
      )
      if (imagePickerController) {
        imagePickerController.open()
      }
    }
  }

  // Editor Customization - Delegates to customize_controller
  openCustomize() {
    const customizeElement = document.querySelector('[data-controller~="customize"]')
    if (customizeElement) {
      const customizeController = this.application.getControllerForElementAndIdentifier(
        customizeElement,
        "customize"
      )
      if (customizeController) {
        customizeController.open(this.currentFont, this.currentFontSize)
      }
    }
  }

  // Handle customize:applied event from customize_controller
  onCustomizeApplied(event) {
    const { font, fontSize } = event.detail

    this.currentFont = font
    this.currentFontSize = fontSize

    // Save to server config
    this.saveConfig({
      editor_font: font,
      editor_font_size: fontSize
    })

    // Apply to editor
    this.applyEditorSettings()
  }

  applyEditorSettings() {
    const font = this.editorFonts.find(f => f.id === this.currentFont)
    if (font && this.hasTextareaTarget) {
      this.textareaTarget.style.fontFamily = font.family
      this.textareaTarget.style.fontSize = `${this.currentFontSize}px`
    }
  }

  // Save config settings to server (debounced)
  saveConfig(settings) {
    // Clear any pending save
    if (this.configSaveTimeout) {
      clearTimeout(this.configSaveTimeout)
    }

    // Debounce saves to avoid excessive API calls
    this.configSaveTimeout = setTimeout(async () => {
      try {
        const response = await fetch("/config", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.content
          },
          body: JSON.stringify(settings)
        })

        if (!response.ok) {
          console.warn("Failed to save config:", await response.text())
        } else {
          // Notify other controllers that config file was modified
          window.dispatchEvent(new CustomEvent("frankmd:config-file-modified"))
        }
      } catch (error) {
        console.warn("Failed to save config:", error)
      }
    }, 500)
  }

  // Reload .fed content if it's open in the editor
  async reloadCurrentConfigFile() {
    try {
      const response = await fetch(`/notes/${encodePath(".fed")}`, {
        headers: { "Accept": "application/json" }
      })

      if (response.ok) {
        const data = await response.json()
        if (this.hasTextareaTarget && this.currentFile === ".fed") {
          // Save cursor position
          const cursorPos = this.textareaTarget.selectionStart
          // Update content
          this.textareaTarget.value = data.content || ""
          // Restore cursor position (or end of file if content is shorter)
          const newCursorPos = Math.min(cursorPos, this.textareaTarget.value.length)
          this.textareaTarget.setSelectionRange(newCursorPos, newCursorPos)
        }
      }
    } catch (error) {
      console.warn("Failed to reload config file:", error)
    }
  }

  // Listen for config file modifications from any source (theme, settings, etc.)
  setupConfigFileListener() {
    this.boundConfigFileHandler = () => {
      // If .fed is currently open in the editor, reload it
      if (this.currentFile === ".fed") {
        this.reloadCurrentConfigFile()
      }
    }
    window.addEventListener("frankmd:config-file-modified", this.boundConfigFileHandler)
  }

  // Preview Zoom - Delegates to preview_controller
  // These methods are kept for backwards compatibility and keyboard shortcuts
  zoomPreviewIn() {
    const previewController = this.getPreviewController()
    if (previewController) {
      previewController.zoomIn()
    }
  }

  zoomPreviewOut() {
    const previewController = this.getPreviewController()
    if (previewController) {
      previewController.zoomOut()
    }
  }

  applyPreviewZoom() {
    const previewController = this.getPreviewController()
    if (previewController) {
      previewController.applyZoom()
    }
  }

  // Sidebar/Explorer Toggle
  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible
    this.saveConfig({ sidebar_visible: this.sidebarVisible })
    this.applySidebarVisibility()
  }

  applySidebarVisibility() {
    if (this.hasSidebarTarget) {
      this.sidebarTarget.classList.toggle("hidden", !this.sidebarVisible)
    }
    if (this.hasSidebarToggleTarget) {
      // Update toggle button icon state if needed
      this.sidebarToggleTarget.setAttribute("aria-expanded", this.sidebarVisible.toString())
    }
  }

  // Typewriter Mode - focused writing mode
  // OFF: explorer open, preview closed, normal scrolling
  // ON: explorer hidden, preview open, cursor kept in middle of editor
  toggleTypewriterMode() {
    // Only allow typewriter mode for markdown files
    if (!this.isMarkdownFile()) {
      this.showTemporaryMessage("Typewriter mode is only available for markdown files")
      return
    }

    this.typewriterModeEnabled = !this.typewriterModeEnabled
    this.saveConfig({ typewriter_mode: this.typewriterModeEnabled })
    this.applyTypewriterMode()

    // Immediately apply typewriter scroll if enabling
    if (this.typewriterModeEnabled) {
      this.maintainTypewriterScroll()
    }
  }

  // Show a temporary message to the user (auto-dismisses)
  showTemporaryMessage(message, duration = 2000) {
    // Remove any existing message
    const existing = document.querySelector(".temporary-message")
    if (existing) existing.remove()

    const el = document.createElement("div")
    el.className = "temporary-message fixed bottom-4 left-1/2 -translate-x-1/2 bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] px-4 py-2 rounded-lg shadow-lg border border-[var(--theme-border)] text-sm z-50"
    el.textContent = message
    document.body.appendChild(el)

    setTimeout(() => el.remove(), duration)
  }

  applyTypewriterMode() {
    if (this.hasTextareaTarget) {
      this.textareaTarget.classList.toggle("typewriter-mode", this.typewriterModeEnabled)
    }

    // Toggle typewriter mode on preview controller
    const previewController = this.getPreviewController()
    if (previewController) {
      previewController.setTypewriterMode(this.typewriterModeEnabled)
    }

    // Update toggle button state if exists
    const typewriterBtn = this.element.querySelector("[data-typewriter-mode-btn]")
    if (typewriterBtn) {
      typewriterBtn.classList.toggle("bg-[var(--theme-bg-hover)]", this.typewriterModeEnabled)
      typewriterBtn.setAttribute("aria-pressed", this.typewriterModeEnabled.toString())
    }

    // Typewriter mode controls explorer and preview visibility
    if (this.typewriterModeEnabled) {
      // Hide explorer
      this.sidebarVisible = false
      this.applySidebarVisibility()

      // Show preview
      if (previewController && !previewController.isVisible) {
        previewController.show()
        this.updatePreview()
        setTimeout(() => this.syncPreviewScrollToCursor(), 50)
      }
    } else {
      // Show explorer
      this.sidebarVisible = true
      this.applySidebarVisibility()

      // Hide preview
      if (previewController && previewController.isVisible) {
        previewController.hide()
      }
    }

    // Save sidebar visibility along with typewriter mode
    this.saveConfig({ sidebar_visible: this.sidebarVisible })
  }

  // Keep cursor at center (50%) of the editor in typewriter mode
  maintainTypewriterScroll() {
    if (!this.typewriterModeEnabled) return
    if (!this.hasTextareaTarget) return

    const textarea = this.textareaTarget
    const text = textarea.value
    const cursorPos = textarea.selectionStart

    // Use mirror div technique to get accurate cursor position
    const cursorY = this.getCursorYPosition(textarea, cursorPos)

    // Target position: 50% from top of visible area (center)
    const targetY = textarea.clientHeight * 0.5

    // Calculate desired scroll position to put cursor at target
    const desiredScrollTop = cursorY - targetY

    // Use setTimeout to ensure we run after all browser scroll behavior
    setTimeout(() => {
      textarea.scrollTop = Math.max(0, desiredScrollTop)

      // Also sync preview if visible
      const previewController = this.getPreviewController()
      if (previewController && previewController.isVisible) {
        const linesBefore = text.substring(0, cursorPos).split("\n").length
        this.syncPreviewToTypewriter(linesBefore, text.split("\n").length)
      }
    }, 0)
  }

  // Get cursor Y position using mirror div technique
  getCursorYPosition(textarea, cursorPos) {
    // Create a mirror div that matches the textarea's styling
    const mirror = document.createElement("div")
    const style = window.getComputedStyle(textarea)

    // Copy relevant styles
    mirror.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: ${textarea.clientWidth}px;
      height: auto;
      font-family: ${style.fontFamily};
      font-size: ${style.fontSize};
      font-weight: ${style.fontWeight};
      line-height: ${style.lineHeight};
      padding: ${style.padding};
      border: ${style.border};
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
    `

    // Get text before cursor and add a marker span
    const textBefore = textarea.value.substring(0, cursorPos)
    mirror.textContent = textBefore

    // Add a marker element at cursor position
    const marker = document.createElement("span")
    marker.textContent = "|"
    mirror.appendChild(marker)

    document.body.appendChild(mirror)
    const cursorY = marker.offsetTop
    document.body.removeChild(mirror)

    return cursorY
  }

  // Sync preview scroll in typewriter mode - Delegates to preview_controller
  syncPreviewToTypewriter(currentLine, totalLines) {
    const previewController = this.getPreviewController()
    if (previewController) {
      previewController.syncToTypewriter(currentLine, totalLines)
    }
  }

  // File Finder (Ctrl+P) - Delegates to file_finder_controller
  openFileFinder() {
    // Build flat list of all files from tree
    const files = flattenTree(this.treeValue)

    // Find the file-finder controller and call open
    const fileFinderElement = document.querySelector('[data-controller~="file-finder"]')
    if (fileFinderElement) {
      const fileFinderController = this.application.getControllerForElementAndIdentifier(
        fileFinderElement,
        "file-finder"
      )
      if (fileFinderController) {
        fileFinderController.open(files)
      }
    }
  }

  // Handle file selected event from file_finder_controller
  onFileSelected(event) {
    const { path } = event.detail
    this.openFileAndRevealInTree(path)
  }

  async openFileAndRevealInTree(path) {
    // Expand all parent folders in the tree
    const parts = path.split("/")
    let currentPath = ""
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i]
      this.expandedFolders.add(currentPath)
    }

    // Show sidebar if hidden
    if (!this.sidebarVisible) {
      this.sidebarVisible = true
      this.saveConfig({ sidebar_visible: true })
      this.applySidebarVisibility()
    }

    // Load the file
    await this.loadFile(path)
  }

  // Content Search (Ctrl+Shift+F) - Delegates to content_search_controller
  openContentSearch() {
    const contentSearchElement = document.querySelector('[data-controller~="content-search"]')
    if (contentSearchElement) {
      const contentSearchController = this.application.getControllerForElementAndIdentifier(
        contentSearchElement,
        "content-search"
      )
      if (contentSearchController) {
        contentSearchController.open()
      }
    }
  }

  // Handle search result selected event from content_search_controller
  async onSearchResultSelected(event) {
    const { path, lineNumber } = event.detail
    await this.openFileAndRevealInTree(path)
    this.jumpToLine(lineNumber)
  }

  jumpToLine(lineNumber) {
    if (!this.hasTextareaTarget) return

    const textarea = this.textareaTarget
    const lines = textarea.value.split("\n")

    // Calculate character position of the line
    let charPos = 0
    for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
      charPos += lines[i].length + 1 // +1 for newline
    }

    // Set cursor position
    textarea.focus()
    textarea.setSelectionRange(charPos, charPos)

    // Scroll to make the line visible
    const style = window.getComputedStyle(textarea)
    const fontSize = parseFloat(style.fontSize) || 14
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.6
    const targetScroll = (lineNumber - 1) * lineHeight - textarea.clientHeight * 0.35

    textarea.scrollTop = Math.max(0, targetScroll)
  }

  // Help Dialog - delegates to help controller
  openHelp() {
    const helpController = this.getHelpController()
    if (helpController) {
      helpController.openHelp()
    }
  }

  getHelpController() {
    const helpElement = document.querySelector('[data-controller~="help"]')
    if (helpElement) {
      return this.application.getControllerForElementAndIdentifier(helpElement, "help")
    }
    return null
  }

  // Code Snippet Editor - Delegates to code_dialog_controller
  openCodeEditor() {
    if (!this.hasTextareaTarget) return

    const text = this.textareaTarget.value
    const cursorPos = this.textareaTarget.selectionStart
    const codeBlock = findCodeBlockAtPosition(text, cursorPos)

    // Find the code-dialog controller and call open
    const codeDialogElement = document.querySelector('[data-controller~="code-dialog"]')
    if (codeDialogElement) {
      const codeDialogController = this.application.getControllerForElementAndIdentifier(
        codeDialogElement,
        "code-dialog"
      )
      if (codeDialogController) {
        if (codeBlock) {
          codeDialogController.open({
            language: codeBlock.language || "",
            content: codeBlock.content || "",
            editMode: true,
            startPos: codeBlock.startPos,
            endPos: codeBlock.endPos
          })
        } else {
          codeDialogController.open()
        }
      }
    }
  }

  // Handle code insert event from code_dialog_controller
  onCodeInsert(event) {
    if (!this.hasTextareaTarget) return

    const { codeBlock, language, editMode, startPos, endPos } = event.detail
    const textarea = this.textareaTarget
    const text = textarea.value

    let newCursorPos

    if (editMode) {
      // Replace existing code block
      const before = text.substring(0, startPos)
      const after = text.substring(endPos)
      textarea.value = before + codeBlock + after

      // Position cursor at first line of content (after ```language\n)
      newCursorPos = startPos + 3 + language.length + 1
    } else {
      // Insert at cursor
      const cursorPos = textarea.selectionStart
      const before = text.substring(0, cursorPos)
      const after = text.substring(cursorPos)

      // Add newlines if needed
      const prefix = before.length > 0 && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : ""
      const suffix = after.length > 0 && !after.startsWith("\n\n") ? (after.startsWith("\n") ? "\n" : "\n\n") : ""

      textarea.value = before + prefix + codeBlock + suffix + after

      // Position cursor at first line inside the fence (after ```language\n)
      newCursorPos = before.length + prefix.length + 3 + language.length + 1
    }

    // Focus first, then set cursor position
    textarea.focus()
    setTimeout(() => {
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
    this.scheduleAutoSave()
    this.updatePreview()
  }

  // About Dialog - delegates to help controller
  openAboutDialog() {
    const helpController = this.getHelpController()
    if (helpController) {
      helpController.openAbout()
    }
  }

  // Video Dialog - delegates to video-dialog controller
  openVideoDialog() {
    const videoDialogElement = document.querySelector('[data-controller~="video-dialog"]')
    if (videoDialogElement) {
      const videoDialogController = this.application.getControllerForElementAndIdentifier(
        videoDialogElement,
        "video-dialog"
      )
      if (videoDialogController) {
        videoDialogController.open()
      }
    }
  }

  // Video Embed Event Handler - receives events from video_dialog_controller
  insertVideoEmbed(event) {
    const { embedCode } = event.detail
    if (!embedCode || !this.hasTextareaTarget) return

    const textarea = this.textareaTarget
    const cursorPos = textarea.selectionStart
    const text = textarea.value
    const before = text.substring(0, cursorPos)
    const after = text.substring(cursorPos)

    // Add newlines if needed
    const prefix = before.length > 0 && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : ""
    const suffix = after.length > 0 && !after.startsWith("\n\n") ? (after.startsWith("\n") ? "\n" : "\n\n") : ""

    textarea.value = before + prefix + embedCode + suffix + after

    const newCursorPos = before.length + prefix.length + embedCode.length
    textarea.focus()
    textarea.setSelectionRange(newCursorPos, newCursorPos)

    this.scheduleAutoSave()
    this.updatePreview()
  }

  // AI Grammar Check Methods - Delegates to ai_grammar_controller

  async openAiDialog() {
    if (!this.currentFile) {
      alert(window.t("errors.no_file_open"))
      return
    }

    const text = this.textareaTarget.value
    if (!text.trim()) {
      alert(window.t("errors.no_text_to_check"))
      return
    }

    // Save file first if there are pending changes (server reads from disk)
    if (this.saveTimeout) {
      await this.saveNow()
    }

    // Find the ai-grammar controller and call open
    const aiGrammarElement = document.querySelector('[data-controller~="ai-grammar"]')
    if (aiGrammarElement) {
      const aiGrammarController = this.application.getControllerForElementAndIdentifier(
        aiGrammarElement,
        "ai-grammar"
      )
      if (aiGrammarController) {
        aiGrammarController.open(this.currentFile)
      }
    }
  }

  // Handle AI processing started event - disable editor and show button loading state
  onAiProcessingStarted() {
    this.textareaTarget.disabled = true

    if (this.hasAiButtonTarget) {
      this.aiButtonOriginalContent = this.aiButtonTarget.innerHTML
      this.aiButtonTarget.innerHTML = `
        <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>${window.t("status.processing")}</span>
      `
      this.aiButtonTarget.disabled = true
    }
  }

  // Handle AI processing ended event - re-enable editor and restore button
  onAiProcessingEnded() {
    this.textareaTarget.disabled = false

    if (this.hasAiButtonTarget && this.aiButtonOriginalContent) {
      this.aiButtonTarget.innerHTML = this.aiButtonOriginalContent
      this.aiButtonTarget.disabled = false
    }
  }

  // Handle AI correction accepted event - update textarea with corrected text
  onAiAccepted(event) {
    const { correctedText } = event.detail
    this.textareaTarget.value = correctedText
    this.onTextareaInput() // Trigger save and preview update
  }

  // Handle preview zoom changed event - save to config
  onPreviewZoomChanged(event) {
    const { zoom } = event.detail
    this.previewZoom = zoom
    this.saveConfig({ preview_zoom: zoom })
  }

  // Handle preview toggled event
  onPreviewToggled(event) {
    const { visible } = event.detail
    if (visible) {
      this.updatePreview()
      setTimeout(() => this.syncPreviewScrollToCursor(), 50)
    }
  }

  // File Operations Event Handlers
  // These handle events dispatched by file_operations_controller

  async onFileCreated(event) {
    const { path } = event.detail

    // Expand parent folders
    const pathParts = path.split("/")
    let expandPath = ""
    for (let i = 0; i < pathParts.length - 1; i++) {
      expandPath = expandPath ? `${expandPath}/${pathParts[i]}` : pathParts[i]
      this.expandedFolders.add(expandPath)
    }

    await this.refreshTree()
    await this.loadFile(path)
  }

  async onFolderCreated(event) {
    const { path } = event.detail
    this.expandedFolders.add(path)
    await this.refreshTree()
  }

  async onFileRenamed(event) {
    const { oldPath, newPath } = event.detail

    // Update current file if it was the renamed file
    if (this.currentFile === oldPath) {
      this.currentFile = newPath
      this.currentPathTarget.textContent = newPath.replace(/\.md$/, "")
    }

    await this.refreshTree()
  }

  async onFileDeleted(event) {
    const { path } = event.detail

    // Clear editor if deleted file was currently open
    if (this.currentFile === path) {
      this.currentFile = null
      this.currentPathTarget.textContent = window.t("editor.select_note")
      this.editorPlaceholderTarget.classList.remove("hidden")
      this.editorTarget.classList.add("hidden")
      this.hideStatsPanel()
    }

    await this.refreshTree()
  }

  // Helper to get file operations controller
  getFileOperationsController() {
    const element = document.querySelector('[data-controller~="file-operations"]')
    return element ? this.application.getControllerForElementAndIdentifier(element, "file-operations") : null
  }

  // File Operations - delegate to file-operations controller
  newNote() {
    const fileOps = this.getFileOperationsController()
    if (fileOps) fileOps.newNote()
  }

  newFolder() {
    const fileOps = this.getFileOperationsController()
    if (fileOps) fileOps.newFolder()
  }

  showContextMenu(event) {
    const fileOps = this.getFileOperationsController()
    if (fileOps) fileOps.showContextMenu(event)
  }

  setupDialogClickOutside() {
    // Close dialog when clicking on backdrop (outside the dialog content)
    // Note: Most dialogs are now extracted to separate controllers that handle their own click-outside
    if (this.hasHelpDialogTarget) {
      this.helpDialogTarget.addEventListener("click", (event) => {
        if (event.target === this.helpDialogTarget) {
          this.helpDialogTarget.close()
        }
      })
    }
  }

  async refreshTree() {
    try {
      const response = await fetch("/notes/tree", {
        headers: { "Accept": "application/json" }
      })
      if (response.ok) {
        this.treeValue = await response.json()
        this.renderTree()
      }
    } catch (error) {
      console.error("Error refreshing tree:", error)
    }
  }

  // Keyboard Shortcuts
  setupKeyboardShortcuts() {
    this.boundKeydownHandler = (event) => {
      // Ctrl/Cmd + N: New note (delegate to file-operations controller)
      if ((event.ctrlKey || event.metaKey) && event.key === "n") {
        event.preventDefault()
        const fileOps = this.getFileOperationsController()
        if (fileOps) fileOps.newNote()
      }

      // Ctrl/Cmd + S: Save
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault()
        this.saveNow()
      }

      // Ctrl/Cmd + Shift + P: Toggle preview
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "P") {
        event.preventDefault()
        this.togglePreview()
      }

      // Ctrl/Cmd + Shift + F: Content search
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "F") {
        event.preventDefault()
        this.openContentSearch()
      }

      // Ctrl/Cmd + P: Open file finder
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key === "p") {
        event.preventDefault()
        this.openFileFinder()
      }

      // Ctrl/Cmd + E: Toggle explorer/sidebar
      if ((event.ctrlKey || event.metaKey) && event.key === "e") {
        event.preventDefault()
        this.toggleSidebar()
      }

      // Ctrl/Cmd + B: Toggle typewriter mode
      if ((event.ctrlKey || event.metaKey) && event.key === "b") {
        event.preventDefault()
        this.toggleTypewriterMode()
      }

      // Escape: Close menus and dialogs managed by app_controller
      // Note: Extracted controllers (file-finder, content-search, code-dialog, customize, file-operations, etc.) handle their own Escape key
      if (event.key === "Escape") {
        // Close context menu (delegated to file-operations controller via target)
        if (this.hasContextMenuTarget) {
          this.contextMenuTarget.classList.add("hidden")
        }

        // Close help dialog
        if (this.hasHelpDialogTarget && this.helpDialogTarget.open) {
          this.helpDialogTarget.close()
        }
      }

      // F1 or Ctrl+H: Open help
      if (event.key === "F1" || ((event.ctrlKey || event.metaKey) && event.key === "h")) {
        event.preventDefault()
        this.openHelp()
      }
    }
    document.addEventListener("keydown", this.boundKeydownHandler)
  }

  // Utilities
  // Get CSRF token safely
  get csrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]')
    return meta ? meta.content : ""
  }

  // Position a dialog near a specific point (for explorer dialogs)
  positionDialogNearPoint(dialog, x, y) {
    dialog.classList.add("positioned")

    // Use showModal first to get dimensions
    dialog.showModal()

    // Get dialog dimensions
    const rect = dialog.getBoundingClientRect()
    const padding = 10

    // Calculate position, keeping dialog on screen
    let left = x
    let top = y

    // Adjust if dialog would go off right edge
    if (left + rect.width > window.innerWidth - padding) {
      left = window.innerWidth - rect.width - padding
    }

    // Adjust if dialog would go off bottom edge
    if (top + rect.height > window.innerHeight - padding) {
      top = window.innerHeight - rect.height - padding
    }

    // Ensure dialog stays on screen (left/top)
    left = Math.max(padding, left)
    top = Math.max(padding, top)

    dialog.style.left = `${left}px`
    dialog.style.top = `${top}px`
  }

  // Show dialog centered (default behavior)
  showDialogCentered(dialog) {
    dialog.classList.remove("positioned")
    dialog.style.left = ""
    dialog.style.top = ""
    dialog.showModal()
  }

  // === Document Stats - delegates to stats-panel controller ===

  getStatsPanelController() {
    const statsPanelElement = document.querySelector('[data-controller~="stats-panel"]')
    if (statsPanelElement) {
      return this.application.getControllerForElementAndIdentifier(statsPanelElement, "stats-panel")
    }
    return null
  }

  showStatsPanel() {
    const statsController = this.getStatsPanelController()
    if (statsController) {
      statsController.show()
    }
  }

  hideStatsPanel() {
    const statsController = this.getStatsPanelController()
    if (statsController) {
      statsController.hide()
    }
  }

  scheduleStatsUpdate() {
    const statsController = this.getStatsPanelController()
    if (statsController && this.hasTextareaTarget) {
      statsController.scheduleUpdate(this.textareaTarget.value)
    }
  }

  updateStats() {
    const statsController = this.getStatsPanelController()
    if (statsController && this.hasTextareaTarget) {
      statsController.update(this.textareaTarget.value)
    }
  }

}
