import { Controller } from "@hotwired/stimulus"
import { marked } from "marked"
import { escapeHtml, fuzzyScore, levenshteinDistance } from "lib/text_utils"
import { findTableAtPosition, findCodeBlockAtPosition, generateHugoBlogPost, slugify } from "lib/markdown_utils"
import { encodePath, extractYouTubeId } from "lib/url_utils"
import { calculateStats, formatFileSize, formatReadTime } from "lib/stats_utils"
import { computeWordDiff } from "lib/diff_utils"
import { flattenTree } from "lib/tree_utils"

export default class extends Controller {
  static targets = [
    "fileTree",
    "editorContainer",
    "editorPlaceholder",
    "editor",
    "textarea",
    "previewPanel",
    "previewContent",
    "previewToggle",
    "currentPath",
    "saveStatus",
    "contextMenu",
    "newNoteBtn",
    "renameDialog",
    "renameInput",
    "noteTypeDialog",
    "newItemDialog",
    "newItemTitle",
    "newItemInput",
    "editorToolbar",
    "helpDialog",
    "tableHint",
    "codeDialog",
    "codeLanguage",
    "codeContent",
    "codeIndentTabs",
    "codeSuggestions",
    "aboutDialog",
    "customizeDialog",
    "fontSelect",
    "fontSizeSelect",
    "fontPreview",
    "previewZoomLevel",
    "sidebar",
    "sidebarToggle",
    "editorWrapper",
    "fileFinderDialog",
    "fileFinderInput",
    "fileFinderResults",
    "fileFinderPreview",
    "contentSearchDialog",
    "contentSearchInput",
    "contentSearchResults",
    "contentSearchStatus",
    "videoDialog",
    "videoUrl",
    "videoPreview",
    "insertVideoBtn",
    "videoTabUrl",
    "videoTabSearch",
    "videoUrlPanel",
    "videoSearchPanel",
    "youtubeSearchInput",
    "youtubeSearchBtn",
    "youtubeSearchStatus",
    "youtubeSearchResults",
    "youtubeConfigNotice",
    "youtubeSearchForm",
    "aiButton",
    "aiDiffDialog",
    "aiConfigNotice",
    "aiDiffContent",
    "aiOriginalText",
    "aiCorrectedText",
    "aiCorrectedDiff",
    "aiProviderBadge",
    "aiEditToggle",
    "aiProcessingOverlay",
    "aiProcessingProvider",
    "statsPanel",
    "statsWords",
    "statsChars",
    "statsSize",
    "statsReadTime"
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
    this.contextItem = null
    this.newItemType = null
    this.newItemParent = ""

    // Context menu click position (for positioning dialogs near click)
    this.contextClickX = 0
    this.contextClickY = 0

    // Code snippet state
    this.codeEditMode = false
    this.codeStartPos = 0
    this.codeEndPos = 0

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

    // Preview zoom state
    this.previewZoomLevels = [50, 75, 90, 100, 110, 125, 150, 175, 200]
    this.previewZoom = parseInt(settings.preview_zoom) || 100

    // Sidebar/Explorer visibility
    this.sidebarVisible = settings.sidebar_visible !== false

    // Typewriter mode - focused writing mode
    this.typewriterModeEnabled = settings.typewriter_mode === true

    // Track pending config saves to debounce
    this.configSaveTimeout = null

    // Document stats update timeout (debounced)
    this.statsUpdateTimeout = null

    // File finder state
    this.allFiles = []
    this.fileFinderResults = []
    this.selectedFileIndex = 0

    // Content search state
    this.searchResultsData = []
    this.selectedSearchIndex = 0
    this.contentSearchTimeout = null
    this.searchUsingKeyboard = false

    // YouTube search state
    this.youtubeSearchResults = []
    this.selectedYoutubeIndex = -1
    this.youtubeApiEnabled = false
    this.checkYoutubeApiEnabled()

    // AI state
    this.aiEnabled = false
    this.checkAiAvailability()

    // Sync scroll state
    this.syncScrollEnabled = true
    this.syncScrollTimeout = null

    this.codeLanguages = [
      "javascript", "typescript", "python", "ruby", "go", "rust", "java", "c", "cpp", "csharp",
      "php", "swift", "kotlin", "scala", "haskell", "elixir", "erlang", "clojure", "lua", "perl",
      "html", "css", "scss", "sass", "less", "json", "yaml", "toml", "xml", "markdown",
      "sql", "graphql", "bash", "shell", "powershell", "dockerfile", "makefile",
      "nginx", "apache", "vim", "regex", "diff", "git", "plaintext"
    ]

    this.renderTree()
    this.setupKeyboardShortcuts()
    this.setupContextMenuClose()
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
    if (this.contentSearchTimeout) clearTimeout(this.contentSearchTimeout)
    if (this.statsUpdateTimeout) clearTimeout(this.statsUpdateTimeout)
    if (this.syncScrollTimeout) clearTimeout(this.syncScrollTimeout)

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
    if (this.boundContextMenuClose) {
      document.removeEventListener("click", this.boundContextMenuClose)
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
      if (this.hasPreviewPanelTarget && !this.previewPanelTarget.classList.contains("hidden")) {
        this.previewPanelTarget.classList.add("hidden")
        this.previewPanelTarget.classList.remove("flex")
        document.body.classList.remove("preview-visible")
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
        this.applyPreviewZoom()
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

  // Preview Panel
  togglePreview() {
    // Only allow preview for markdown files
    if (!this.isMarkdownFile()) {
      this.showTemporaryMessage("Preview is only available for markdown files")
      return
    }

    const isHidden = this.previewPanelTarget.classList.contains("hidden")
    this.previewPanelTarget.classList.toggle("hidden", !isHidden)
    this.previewPanelTarget.classList.toggle("flex", isHidden)

    // Toggle preview-visible class on body for CSS adjustments
    document.body.classList.toggle("preview-visible", isHidden)

    if (isHidden) {
      this.updatePreview()
      // Sync scroll position after a brief delay for DOM to settle
      setTimeout(() => this.syncPreviewScrollToCursor(), 50)
    }
  }

  updatePreview() {
    if (this.previewPanelTarget.classList.contains("hidden")) return
    if (!this.hasTextareaTarget) return

    const content = this.textareaTarget.value
    this.previewContentTarget.innerHTML = marked.parse(content)

    // Sync scroll after updating preview content
    if (this.typewriterModeEnabled) {
      // In typewriter mode, sync preview to cursor position
      const textBeforeCursor = content.substring(0, this.textareaTarget.selectionStart)
      const linesBefore = textBeforeCursor.split("\n").length
      const totalLines = content.split("\n").length
      this.syncPreviewToTypewriter(linesBefore, totalLines)
    } else {
      this.syncPreviewScroll()
    }
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
    if (this.previewPanelTarget.classList.contains("hidden")) return
    if (!this.hasTextareaTarget || !this.hasPreviewContentTarget) return

    // Debounce to avoid excessive updates
    if (this.syncScrollTimeout) {
      cancelAnimationFrame(this.syncScrollTimeout)
    }

    this.syncScrollTimeout = requestAnimationFrame(() => {
      const textarea = this.textareaTarget
      const preview = this.previewContentTarget

      // Calculate scroll percentage in textarea
      const scrollTop = textarea.scrollTop
      const scrollHeight = textarea.scrollHeight - textarea.clientHeight

      if (scrollHeight <= 0) return

      const scrollRatio = scrollTop / scrollHeight

      // Apply same ratio to preview
      const previewScrollHeight = preview.scrollHeight - preview.clientHeight
      if (previewScrollHeight > 0) {
        preview.scrollTop = scrollRatio * previewScrollHeight
      }
    })
  }

  syncPreviewScrollToCursor() {
    if (!this.syncScrollEnabled) return
    if (this.previewPanelTarget.classList.contains("hidden")) return
    if (!this.hasTextareaTarget || !this.hasPreviewContentTarget) return

    const textarea = this.textareaTarget
    const content = textarea.value
    const cursorPos = textarea.selectionStart

    // Find which line the cursor is on
    const textBeforeCursor = content.substring(0, cursorPos)
    const linesBefore = textBeforeCursor.split("\n").length
    const totalLines = content.split("\n").length

    if (totalLines <= 1) return

    // Calculate position ratio based on line number
    const lineRatio = (linesBefore - 1) / (totalLines - 1)

    // Apply to preview with smooth behavior
    const preview = this.previewContentTarget
    const previewScrollHeight = preview.scrollHeight - preview.clientHeight

    if (previewScrollHeight > 0) {
      const targetScroll = lineRatio * previewScrollHeight

      // Smooth scroll for cursor-based sync
      preview.scrollTo({
        top: targetScroll,
        behavior: "smooth"
      })
    }
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

  // Editor Customization
  openCustomize() {
    // Set current values in the selects
    this.fontSelectTarget.value = this.currentFont
    this.fontSizeSelectTarget.value = this.currentFontSize

    // Update preview with current settings
    this.updateFontPreview()

    this.showDialogCentered(this.customizeDialogTarget)
  }

  closeCustomizeDialog() {
    this.customizeDialogTarget.close()
  }

  onFontChange() {
    this.updateFontPreview()
  }

  onFontSizeChange() {
    this.updateFontPreview()
  }

  updateFontPreview() {
    const fontId = this.fontSelectTarget.value
    const fontSize = this.fontSizeSelectTarget.value
    const font = this.editorFonts.find(f => f.id === fontId)

    if (font && this.hasFontPreviewTarget) {
      this.fontPreviewTarget.style.fontFamily = font.family
      this.fontPreviewTarget.style.fontSize = `${fontSize}px`
    }
  }

  applyCustomization() {
    this.currentFont = this.fontSelectTarget.value
    this.currentFontSize = parseInt(this.fontSizeSelectTarget.value)

    // Save to server config
    this.saveConfig({
      editor_font: this.currentFont,
      editor_font_size: this.currentFontSize
    })

    // Apply to editor
    this.applyEditorSettings()

    this.customizeDialogTarget.close()
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

  // Preview Zoom
  zoomPreviewIn() {
    const currentIndex = this.previewZoomLevels.indexOf(this.previewZoom)
    if (currentIndex < this.previewZoomLevels.length - 1) {
      this.previewZoom = this.previewZoomLevels[currentIndex + 1]
      this.applyPreviewZoom()
      this.saveConfig({ preview_zoom: this.previewZoom })
    }
  }

  zoomPreviewOut() {
    const currentIndex = this.previewZoomLevels.indexOf(this.previewZoom)
    if (currentIndex > 0) {
      this.previewZoom = this.previewZoomLevels[currentIndex - 1]
      this.applyPreviewZoom()
      this.saveConfig({ preview_zoom: this.previewZoom })
    }
  }

  applyPreviewZoom() {
    if (this.hasPreviewContentTarget) {
      this.previewContentTarget.style.fontSize = `${this.previewZoom}%`
    }
    if (this.hasPreviewZoomLevelTarget) {
      this.previewZoomLevelTarget.textContent = `${this.previewZoom}%`
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

    // Also toggle typewriter mode class on preview content for matching padding
    if (this.hasPreviewContentTarget) {
      this.previewContentTarget.classList.toggle("preview-typewriter-mode", this.typewriterModeEnabled)
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
      if (this.hasPreviewPanelTarget && this.previewPanelTarget.classList.contains("hidden")) {
        this.previewPanelTarget.classList.remove("hidden")
        this.previewPanelTarget.classList.add("flex")
        document.body.classList.add("preview-visible")
        this.updatePreview()
        setTimeout(() => this.syncPreviewScrollToCursor(), 50)
      }
    } else {
      // Show explorer
      this.sidebarVisible = true
      this.applySidebarVisibility()

      // Hide preview
      if (this.hasPreviewPanelTarget && !this.previewPanelTarget.classList.contains("hidden")) {
        this.previewPanelTarget.classList.add("hidden")
        this.previewPanelTarget.classList.remove("flex")
        document.body.classList.remove("preview-visible")
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
      const linesBefore = text.substring(0, cursorPos).split("\n").length
      if (!this.previewPanelTarget.classList.contains("hidden")) {
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

  // Sync preview scroll in typewriter mode
  syncPreviewToTypewriter(currentLine, totalLines) {
    if (!this.hasPreviewContentTarget) return
    if (totalLines <= 1) return

    const preview = this.previewContentTarget
    const lineRatio = (currentLine - 1) / (totalLines - 1)

    // In typewriter mode, preview has 50vh padding at bottom (like editor)
    // Calculate the actual content height (excluding the padding)
    const style = window.getComputedStyle(preview)
    const paddingBottom = parseFloat(style.paddingBottom) || 0
    const actualContentHeight = preview.scrollHeight - paddingBottom

    // Position in the actual content based on line ratio
    const contentPosition = lineRatio * actualContentHeight

    // We want this position to appear at 50% of visible area (center)
    const targetY = preview.clientHeight * 0.5
    const desiredScroll = contentPosition - targetY

    // Max scroll is scrollHeight - clientHeight (browser handles the limit)
    preview.scrollTop = Math.max(0, desiredScroll)
  }

  // File Finder (Ctrl+P)
  openFileFinder() {
    // Build flat list of all files from tree
    this.allFiles = flattenTree(this.treeValue)
    this.fileFinderResults = [...this.allFiles].slice(0, 10)
    this.selectedFileIndex = 0

    this.fileFinderInputTarget.value = ""
    this.renderFileFinderResults()
    this.showDialogCentered(this.fileFinderDialogTarget)
    this.fileFinderInputTarget.focus()
  }

  closeFileFinder() {
    this.fileFinderDialogTarget.close()
  }

  onFileFinderInput() {
    const query = this.fileFinderInputTarget.value.trim().toLowerCase()

    if (!query) {
      this.fileFinderResults = [...this.allFiles].slice(0, 10)
    } else {
      // Fuzzy search: search in full path (including directories)
      this.fileFinderResults = this.allFiles
        .map(file => {
          const score = fuzzyScore(file.path.toLowerCase(), query)
          return { ...file, score }
        })
        .filter(file => file.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
    }

    this.selectedFileIndex = 0
    this.renderFileFinderResults()
  }

  renderFileFinderResults() {
    if (this.fileFinderResults.length === 0) {
      this.fileFinderResultsTarget.innerHTML = `
        <div class="px-3 py-6 text-center text-[var(--theme-text-muted)] text-sm">
          ${window.t("sidebar.no_files_found")}
        </div>
      `
      this.fileFinderPreviewTarget.innerHTML = ""
      return
    }

    this.fileFinderResultsTarget.innerHTML = this.fileFinderResults
      .map((file, index) => {
        const isSelected = index === this.selectedFileIndex
        const name = file.name.replace(/\.md$/, "")
        const path = file.path.replace(/\.md$/, "")
        const displayPath = path !== name ? path.replace(new RegExp(`${name}$`), "").replace(/\/$/, "") : ""

        return `
          <button
            type="button"
            class="w-full px-3 py-2 text-left flex items-center gap-2 ${isSelected ? 'bg-[var(--theme-accent)] text-[var(--theme-accent-text)]' : 'hover:bg-[var(--theme-bg-hover)]'}"
            data-index="${index}"
            data-path="${escapeHtml(file.path)}"
            data-action="click->app#selectFileFromFinder mouseenter->app#hoverFileFinderResult"
          >
            <svg class="w-4 h-4 flex-shrink-0 ${isSelected ? '' : 'text-[var(--theme-text-muted)]'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium">${escapeHtml(name)}</div>
              ${displayPath ? `<div class="truncate text-xs ${isSelected ? 'opacity-75' : 'text-[var(--theme-text-muted)]'}">${escapeHtml(displayPath)}</div>` : ''}
            </div>
          </button>
        `
      })
      .join("")

    this.loadFilePreview()
  }

  async loadFilePreview() {
    if (this.fileFinderResults.length === 0) {
      this.fileFinderPreviewTarget.innerHTML = ""
      return
    }

    const file = this.fileFinderResults[this.selectedFileIndex]
    if (!file) return

    try {
      const response = await fetch(`/notes/${encodePath(file.path)}`, {
        headers: { "Accept": "application/json" }
      })

      if (!response.ok) {
        this.fileFinderPreviewTarget.innerHTML = `<div class="text-[var(--theme-text-muted)] text-sm">Unable to load preview</div>`
        return
      }

      const data = await response.json()
      const lines = (data.content || "").split("\n").slice(0, 10)
      const preview = lines.join("\n")

      this.fileFinderPreviewTarget.innerHTML = `<pre class="text-xs font-mono whitespace-pre-wrap text-[var(--theme-text-secondary)] leading-relaxed">${escapeHtml(preview)}${lines.length >= 10 ? '\n...' : ''}</pre>`
    } catch (error) {
      this.fileFinderPreviewTarget.innerHTML = `<div class="text-[var(--theme-text-muted)] text-sm">Unable to load preview</div>`
    }
  }

  onFileFinderKeydown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (this.selectedFileIndex < this.fileFinderResults.length - 1) {
        this.selectedFileIndex++
        this.renderFileFinderResults()
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      if (this.selectedFileIndex > 0) {
        this.selectedFileIndex--
        this.renderFileFinderResults()
      }
    } else if (event.key === "Enter") {
      event.preventDefault()
      this.selectCurrentFile()
    }
  }

  hoverFileFinderResult(event) {
    const index = parseInt(event.currentTarget.dataset.index)
    if (index !== this.selectedFileIndex) {
      this.selectedFileIndex = index
      this.renderFileFinderResults()
    }
  }

  selectFileFromFinder(event) {
    const path = event.currentTarget.dataset.path
    this.openFileAndRevealInTree(path)
  }

  selectCurrentFile() {
    if (this.fileFinderResults.length === 0) return
    const file = this.fileFinderResults[this.selectedFileIndex]
    if (file) {
      this.openFileAndRevealInTree(file.path)
    }
  }

  async openFileAndRevealInTree(path) {
    // Close the finder
    this.fileFinderDialogTarget.close()

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

  // Content Search (Ctrl+Shift+F)
  openContentSearch() {
    this.searchResultsData = []
    this.selectedSearchIndex = 0
    this.contentSearchInputTarget.value = ""
    this.contentSearchResultsTarget.innerHTML = ""
    this.contentSearchStatusTarget.textContent = window.t("status.type_to_search_regex")
    this.showDialogCentered(this.contentSearchDialogTarget)
    this.contentSearchInputTarget.focus()
  }

  closeContentSearch() {
    this.contentSearchDialogTarget.close()
  }

  onContentSearchInput() {
    const query = this.contentSearchInputTarget.value.trim()

    // Debounce search
    if (this.contentSearchTimeout) {
      clearTimeout(this.contentSearchTimeout)
    }

    if (!query) {
      this.searchResultsData = []
      this.contentSearchResultsTarget.innerHTML = ""
      this.contentSearchStatusTarget.textContent = window.t("status.type_to_search_regex")
      return
    }

    this.contentSearchStatusTarget.textContent = window.t("status.searching")

    this.contentSearchTimeout = setTimeout(async () => {
      await this.performContentSearch(query)
    }, 300)
  }

  async performContentSearch(query) {
    try {
      const response = await fetch(`/notes/search?q=${encodeURIComponent(query)}`, {
        headers: { "Accept": "application/json" }
      })

      if (!response.ok) {
        throw new Error(window.t("errors.search_failed"))
      }

      this.searchResultsData = await response.json()
      this.selectedSearchIndex = 0
      this.renderContentSearchResults()

      const count = this.searchResultsData.length
      const maxMsg = count >= 20 ? " (showing first 20)" : ""
      this.contentSearchStatusTarget.textContent = count === 0
        ? window.t("status.no_matches")
        : `${count} match${count === 1 ? "" : "es"} found${maxMsg} - use ↑↓ to navigate, Enter to open`
    } catch (error) {
      console.error("Search error:", error)
      this.contentSearchStatusTarget.textContent = window.t("status.search_error")
      this.contentSearchResultsTarget.innerHTML = ""
    }
  }

  renderContentSearchResults() {
    if (this.searchResultsData.length === 0) {
      this.contentSearchResultsTarget.innerHTML = `
        <div class="px-4 py-8 text-center text-[var(--theme-text-muted)] text-sm">
          ${window.t("status.no_matches")}
        </div>
      `
      return
    }

    this.contentSearchResultsTarget.innerHTML = this.searchResultsData
      .map((result, index) => {
        const isSelected = index === this.selectedSearchIndex
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
            data-action="click->app#selectContentSearchResult mouseenter->app#hoverContentSearchResult"
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

  onContentSearchKeydown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      this.searchUsingKeyboard = true
      if (this.selectedSearchIndex < this.searchResultsData.length - 1) {
        this.selectedSearchIndex++
        this.renderContentSearchResults()
        this.scrollSearchResultIntoView()
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      this.searchUsingKeyboard = true
      if (this.selectedSearchIndex > 0) {
        this.selectedSearchIndex--
        this.renderContentSearchResults()
        this.scrollSearchResultIntoView()
      }
    } else if (event.key === "Enter") {
      event.preventDefault()
      this.openSelectedSearchResult()
    }
  }

  scrollSearchResultIntoView() {
    const selected = this.contentSearchResultsTarget.querySelector(`[data-index="${this.selectedSearchIndex}"]`)
    if (selected) {
      selected.scrollIntoView({ block: "nearest" })
    }
  }

  hoverContentSearchResult(event) {
    // Ignore hover events when navigating with keyboard
    if (this.searchUsingKeyboard) return

    const index = parseInt(event.currentTarget.dataset.index)
    if (index !== this.selectedSearchIndex) {
      this.selectedSearchIndex = index
      this.renderContentSearchResults()
    }
  }

  onContentSearchMouseMove() {
    // Re-enable mouse selection when mouse moves
    this.searchUsingKeyboard = false
  }

  selectContentSearchResult(event) {
    const path = event.currentTarget.dataset.path
    const line = parseInt(event.currentTarget.dataset.line)
    this.openSearchResultFile(path, line)
  }

  openSelectedSearchResult() {
    if (this.searchResultsData.length === 0) return
    const result = this.searchResultsData[this.selectedSearchIndex]
    if (result) {
      this.openSearchResultFile(result.path, result.line_number)
    }
  }

  async openSearchResultFile(path, lineNumber) {
    // Close the search dialog
    this.contentSearchDialogTarget.close()

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

    // Jump to line after file loads
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

  // Help Dialog
  openHelp() {
    this.showDialogCentered(this.helpDialogTarget)
  }

  closeHelp() {
    this.helpDialogTarget.close()
  }

  // Code Snippet Editor
  openCodeEditor() {
    if (this.hasTextareaTarget) {
      const text = this.textareaTarget.value
      const cursorPos = this.textareaTarget.selectionStart
      const codeBlock = findCodeBlockAtPosition(text, cursorPos)

      if (codeBlock) {
        // Edit existing code block
        this.codeEditMode = true
        this.codeStartPos = codeBlock.startPos
        this.codeEndPos = codeBlock.endPos
        this.codeLanguageTarget.value = codeBlock.language || ""
        this.codeContentTarget.value = codeBlock.content || ""
      } else {
        // New code block
        this.codeEditMode = false
        this.codeLanguageTarget.value = ""
        this.codeContentTarget.value = ""
      }
    } else {
      this.codeEditMode = false
      this.codeLanguageTarget.value = ""
      this.codeContentTarget.value = ""
    }

    this.hideSuggestions()
    this.showDialogCentered(this.codeDialogTarget)
    this.codeLanguageTarget.focus()
  }

  closeCodeDialog() {
    this.codeDialogTarget.close()
  }

  // About Dialog
  openAboutDialog() {
    this.showDialogCentered(this.aboutDialogTarget)
  }

  closeAboutDialog() {
    this.aboutDialogTarget.close()
  }

  onCodeLanguageInput() {
    const value = this.codeLanguageTarget.value.toLowerCase().trim()

    if (!value) {
      this.hideSuggestions()
      return
    }

    // Filter languages that start with or contain the input
    const matches = this.codeLanguages.filter(lang =>
      lang.startsWith(value) || lang.includes(value)
    ).slice(0, 6)

    if (matches.length > 0 && matches[0] !== value) {
      this.showSuggestions(matches)
    } else {
      this.hideSuggestions()
    }
  }

  onCodeLanguageKeydown(event) {
    if (event.key === "Tab") {
      const suggestions = this.codeSuggestionsTarget
      if (!suggestions.classList.contains("hidden")) {
        event.preventDefault()
        const firstSuggestion = suggestions.querySelector("button")
        if (firstSuggestion) {
          this.codeLanguageTarget.value = firstSuggestion.dataset.language
          this.hideSuggestions()
        }
      }
    } else if (event.key === "Escape") {
      this.hideSuggestions()
    } else if (event.key === "ArrowDown") {
      const suggestions = this.codeSuggestionsTarget
      if (!suggestions.classList.contains("hidden")) {
        event.preventDefault()
        const firstBtn = suggestions.querySelector("button")
        if (firstBtn) firstBtn.focus()
      }
    } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      this.insertCode()
    }
  }

  onCodeContentKeydown(event) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      this.insertCode()
      return
    }

    // Handle Tab key for indentation
    if (event.key === "Tab") {
      event.preventDefault()
      const textarea = this.codeContentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value

      // Determine indent character(s)
      const useTabs = this.hasCodeIndentTabsTarget && this.codeIndentTabsTarget.checked
      const indent = useTabs ? "\t" : "  "

      if (start === end) {
        // No selection - just insert indent at cursor
        if (event.shiftKey) {
          // Outdent: remove indent from start of current line
          const lineStart = value.lastIndexOf("\n", start - 1) + 1
          const lineContent = value.substring(lineStart, start)
          if (lineContent.startsWith(indent)) {
            textarea.value = value.substring(0, lineStart) + value.substring(lineStart + indent.length)
            textarea.selectionStart = textarea.selectionEnd = start - indent.length
          } else if (lineContent.startsWith("\t") || lineContent.startsWith(" ")) {
            // Remove single space or tab if exact indent not found
            const removeLen = lineContent.startsWith("\t") ? 1 : Math.min(lineContent.match(/^ */)[0].length, indent.length)
            textarea.value = value.substring(0, lineStart) + value.substring(lineStart + removeLen)
            textarea.selectionStart = textarea.selectionEnd = start - removeLen
          }
        } else {
          // Indent: insert at cursor
          textarea.value = value.substring(0, start) + indent + value.substring(end)
          textarea.selectionStart = textarea.selectionEnd = start + indent.length
        }
      } else {
        // Selection exists - indent/outdent all selected lines
        const lineStart = value.lastIndexOf("\n", start - 1) + 1
        const lineEnd = value.indexOf("\n", end)
        const actualEnd = lineEnd === -1 ? value.length : lineEnd
        const selectedLines = value.substring(lineStart, actualEnd)
        const lines = selectedLines.split("\n")

        let newLines
        if (event.shiftKey) {
          // Outdent
          newLines = lines.map(line => {
            if (line.startsWith(indent)) {
              return line.substring(indent.length)
            } else if (line.startsWith("\t")) {
              return line.substring(1)
            } else if (line.startsWith(" ")) {
              const spaces = line.match(/^ */)[0].length
              return line.substring(Math.min(spaces, indent.length))
            }
            return line
          })
        } else {
          // Indent
          newLines = lines.map(line => indent + line)
        }

        const newText = newLines.join("\n")
        textarea.value = value.substring(0, lineStart) + newText + value.substring(actualEnd)

        // Restore selection
        textarea.selectionStart = lineStart
        textarea.selectionEnd = lineStart + newText.length
      }

      // Trigger input event for any listeners
      textarea.dispatchEvent(new Event("input", { bubbles: true }))
    }
  }

  onSuggestionKeydown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      const next = event.target.nextElementSibling
      if (next) next.focus()
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      const prev = event.target.previousElementSibling
      if (prev) {
        prev.focus()
      } else {
        this.codeLanguageTarget.focus()
      }
    } else if (event.key === "Escape") {
      this.hideSuggestions()
      this.codeLanguageTarget.focus()
    }
  }

  showSuggestions(matches) {
    const container = this.codeSuggestionsTarget
    container.innerHTML = matches.map(lang => `
      <button
        type="button"
        class="w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--theme-bg-hover)] focus:bg-[var(--theme-bg-hover)] focus:outline-none text-[var(--theme-text-primary)]"
        data-language="${lang}"
        data-action="click->app#selectLanguage keydown->app#onSuggestionKeydown"
      >
        ${lang}
      </button>
    `).join("")
    container.classList.remove("hidden")
  }

  hideSuggestions() {
    this.codeSuggestionsTarget.classList.add("hidden")
  }

  selectLanguage(event) {
    this.codeLanguageTarget.value = event.currentTarget.dataset.language
    this.hideSuggestions()
    this.codeContentTarget.focus()
  }

  insertCode() {
    if (!this.hasTextareaTarget) {
      this.codeDialogTarget.close()
      return
    }

    const language = this.codeLanguageTarget.value.trim()
    const content = this.codeContentTarget.value

    // Validate language if provided
    if (language && !this.codeLanguages.includes(language.toLowerCase())) {
      const isClose = this.codeLanguages.some(lang =>
        lang.startsWith(language.toLowerCase()) ||
        levenshteinDistance(lang, language.toLowerCase()) <= 2
      )
      if (!isClose) {
        const proceed = confirm(window.t("dialogs.code.unrecognized_language", { language }))
        if (!proceed) return
      }
    }

    const textarea = this.textareaTarget
    const text = textarea.value

    // Build the code fence - ensure there's always a line inside for cursor positioning
    let codeBlock
    if (content) {
      codeBlock = "```" + language + "\n" + content + (content.endsWith("\n") ? "" : "\n") + "```"
    } else {
      // Empty content: add a blank line inside the fence
      codeBlock = "```" + language + "\n\n```"
    }

    let newCursorPos

    if (this.codeEditMode) {
      // Replace existing code block
      const before = text.substring(0, this.codeStartPos)
      const after = text.substring(this.codeEndPos)
      textarea.value = before + codeBlock + after

      // Position cursor at first line of content (after ```language\n)
      newCursorPos = this.codeStartPos + 3 + language.length + 1
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
    // Use setTimeout to ensure the cursor positioning happens after focus
    setTimeout(() => {
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
    this.scheduleAutoSave()
    this.updatePreview()
    this.codeDialogTarget.close()
  }

  // Simple Levenshtein distance for typo detection
  // Video Dialog
  openVideoDialog() {
    // Reset URL tab
    this.videoUrlTarget.value = ""
    this.videoPreviewTarget.innerHTML = '<span class="text-[var(--theme-text-muted)]">Enter a URL to see preview</span>'
    this.insertVideoBtnTarget.disabled = true
    this.detectedVideoType = null
    this.detectedVideoData = null

    // Reset search tab
    if (this.hasYoutubeSearchInputTarget) {
      this.youtubeSearchInputTarget.value = ""
    }
    if (this.hasYoutubeSearchResultsTarget) {
      this.youtubeSearchResultsTarget.innerHTML = ""
    }
    if (this.hasYoutubeSearchStatusTarget) {
      this.youtubeSearchStatusTarget.textContent = window.t("status.enter_keywords_search")
    }
    this.youtubeSearchResults = []
    this.selectedYoutubeIndex = -1

    // Show/hide YouTube config notice based on feature availability
    if (this.hasYoutubeConfigNoticeTarget && this.hasYoutubeSearchFormTarget) {
      const youtubeConfigured = this.youtubeApiEnabled
      this.youtubeConfigNoticeTarget.classList.toggle("hidden", youtubeConfigured)
      this.youtubeSearchFormTarget.classList.toggle("hidden", !youtubeConfigured)
    }

    // Reset to URL tab
    this.switchVideoTab({ currentTarget: { dataset: { tab: "url" } } })

    this.showDialogCentered(this.videoDialogTarget)
    this.videoUrlTarget.focus()
  }

  async checkYoutubeApiEnabled() {
    try {
      const response = await fetch("/youtube/config")
      if (response.ok) {
        const data = await response.json()
        this.youtubeApiEnabled = data.enabled
      }
    } catch (error) {
      this.youtubeApiEnabled = false
    }
  }

  // AI Grammar Check Methods

  async checkAiAvailability() {
    try {
      const response = await fetch("/ai/config")
      if (response.ok) {
        const data = await response.json()
        this.aiEnabled = data.enabled
        this.aiProvider = data.provider
        this.aiModel = data.model
        this.aiAvailableProviders = data.available_providers || []
      }
    } catch (e) {
      console.debug("AI config check failed:", e)
      this.aiEnabled = false
      this.aiProvider = null
      this.aiModel = null
      this.aiAvailableProviders = []
    }
  }

  async openAiDialog() {
    // Hide provider badge initially
    if (this.hasAiProviderBadgeTarget) {
      this.aiProviderBadgeTarget.classList.add("hidden")
    }

    // If AI is not configured, show the config notice
    if (!this.aiEnabled) {
      this.aiConfigNoticeTarget.classList.remove("hidden")
      this.aiDiffContentTarget.classList.add("hidden")
      this.showDialogCentered(this.aiDiffDialogTarget)
      return
    }

    if (!this.currentFile) {
      alert(window.t("errors.no_file_open"))
      return
    }

    const text = this.textareaTarget.value
    if (!text.trim()) {
      alert(window.t("errors.no_text_to_check"))
      return
    }

    // Show loading state on button
    const button = this.aiButtonTarget
    const originalContent = button.innerHTML
    button.innerHTML = `
      <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>${window.t("status.processing")}</span>
    `
    button.disabled = true

    // Save file first if there are pending changes (server reads from disk)
    if (this.saveTimeout) {
      await this.saveNow()
    }

    // Show processing overlay with provider/model info and disable editor
    if (this.hasAiProcessingOverlayTarget) {
      // Update the provider/model display
      if (this.hasAiProcessingProviderTarget && this.aiProvider && this.aiModel) {
        this.aiProcessingProviderTarget.textContent = `${this.aiProvider}: ${this.aiModel}`
      } else if (this.hasAiProcessingProviderTarget) {
        this.aiProcessingProviderTarget.textContent = "AI"
      }
      this.aiProcessingOverlayTarget.classList.remove("hidden")
    }
    this.textareaTarget.disabled = true

    // Setup abort controller for ESC key cancellation
    this.aiAbortController = new AbortController()
    const handleEscKey = (e) => {
      if (e.key === "Escape" && this.aiAbortController) {
        this.aiAbortController.abort()
      }
    }
    document.addEventListener("keydown", handleEscKey)

    try {
      // Send just the path - server reads the file directly
      const response = await fetch("/ai/fix_grammar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfToken
        },
        body: JSON.stringify({ path: this.currentFile }),
        signal: this.aiAbortController.signal
      })

      const data = await response.json()

      if (data.error) {
        alert(`${window.t("errors.failed_to_process_ai")}: ${data.error}`)
        return
      }

      // Show provider badge
      if (this.hasAiProviderBadgeTarget && data.provider && data.model) {
        this.aiProviderBadgeTarget.textContent = `${data.provider}: ${data.model}`
        this.aiProviderBadgeTarget.classList.remove("hidden")
      }

      // Populate and show dialog with diff content
      this.aiConfigNoticeTarget.classList.add("hidden")
      this.aiDiffContentTarget.classList.remove("hidden")
      this.aiDiffContentTarget.classList.add("flex")

      // Compute and display diff (use original from server response)
      const diff = computeWordDiff(data.original, data.corrected)
      this.aiOriginalTextTarget.innerHTML = this.renderDiffOriginal(diff)
      this.aiCorrectedDiffTarget.innerHTML = this.renderDiffCorrected(diff)
      this.aiCorrectedTextTarget.value = data.corrected

      // Reset to diff view mode
      this.aiCorrectedDiffTarget.classList.remove("hidden")
      this.aiCorrectedTextTarget.classList.add("hidden")
      if (this.hasAiEditToggleTarget) {
        this.aiEditToggleTarget.textContent = window.t("common.edit")
      }

      this.showDialogCentered(this.aiDiffDialogTarget)
    } catch (e) {
      if (e.name === "AbortError") {
        console.log("AI request cancelled by user")
      } else {
        console.error("AI request failed:", e)
        alert(window.t("errors.failed_to_process_ai"))
      }
    } finally {
      // Cleanup
      document.removeEventListener("keydown", handleEscKey)
      this.aiAbortController = null
      button.innerHTML = originalContent
      button.disabled = false
      this.textareaTarget.disabled = false
      if (this.hasAiProcessingOverlayTarget) {
        this.aiProcessingOverlayTarget.classList.add("hidden")
      }
    }
  }

  closeAiDiffDialog() {
    this.aiDiffDialogTarget.close()
  }

  toggleAiEditMode() {
    const isEditing = !this.aiCorrectedTextTarget.classList.contains("hidden")

    if (isEditing) {
      // Switch to diff view
      this.aiCorrectedTextTarget.classList.add("hidden")
      this.aiCorrectedDiffTarget.classList.remove("hidden")
      this.aiEditToggleTarget.textContent = window.t("common.edit")
    } else {
      // Switch to edit view
      this.aiCorrectedDiffTarget.classList.add("hidden")
      this.aiCorrectedTextTarget.classList.remove("hidden")
      this.aiEditToggleTarget.textContent = window.t("preview.title")
      this.aiCorrectedTextTarget.focus()
    }
  }

  acceptAiCorrection() {
    const correctedText = this.aiCorrectedTextTarget.value
    this.textareaTarget.value = correctedText
    this.closeAiDiffDialog()
    this.onTextareaInput() // Trigger save and preview update
  }

  // Word-level diff computation using Myers' diff algorithm (simplified)
  // Render diff for the original text column (shows deletions)
  renderDiffOriginal(diff) {
    const escapeHtml = (text) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }

    let html = ''
    for (const item of diff) {
      const escaped = escapeHtml(item.value)
      if (item.type === 'equal') {
        html += `<span class="ai-diff-equal">${escaped}</span>`
      } else if (item.type === 'delete') {
        html += `<span class="ai-diff-del">${escaped}</span>`
      }
      // Don't show insertions in original view
    }
    return html
  }

  // Render diff for the corrected text column (shows additions)
  renderDiffCorrected(diff) {
    const escapeHtml = (text) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }

    let html = ''
    for (const item of diff) {
      const escaped = escapeHtml(item.value)
      if (item.type === 'equal') {
        html += `<span class="ai-diff-equal">${escaped}</span>`
      } else if (item.type === 'insert') {
        html += `<span class="ai-diff-add">${escaped}</span>`
      }
      // Don't show deletions in corrected view
    }
    return html
  }

  switchVideoTab(event) {
    const tab = event.currentTarget.dataset.tab

    // Update tab buttons
    const urlTabClasses = tab === "url"
      ? "border-[var(--theme-accent)] text-[var(--theme-accent)]"
      : "border-transparent text-[var(--theme-text-muted)] hover:text-[var(--theme-text-secondary)]"
    const searchTabClasses = tab === "search"
      ? "border-[var(--theme-accent)] text-[var(--theme-accent)]"
      : "border-transparent text-[var(--theme-text-muted)] hover:text-[var(--theme-text-secondary)]"

    this.videoTabUrlTarget.className = `px-4 py-2 text-sm font-medium border-b-2 ${urlTabClasses}`
    this.videoTabSearchTarget.className = `px-4 py-2 text-sm font-medium border-b-2 ${searchTabClasses}`

    // Show/hide panels
    this.videoUrlPanelTarget.classList.toggle("hidden", tab !== "url")
    this.videoSearchPanelTarget.classList.toggle("hidden", tab !== "search")

    // Focus appropriate input
    if (tab === "url") {
      this.videoUrlTarget.focus()
    } else if (tab === "search" && this.hasYoutubeSearchInputTarget && this.youtubeApiEnabled) {
      this.youtubeSearchInputTarget.focus()
    }
  }

  closeVideoDialog() {
    this.videoDialogTarget.close()
  }

  onVideoUrlInput() {
    const url = this.videoUrlTarget.value.trim()

    if (!url) {
      this.videoPreviewTarget.innerHTML = '<span class="text-[var(--theme-text-muted)]">Enter a URL to see preview</span>'
      this.insertVideoBtnTarget.disabled = true
      this.detectedVideoType = null
      return
    }

    // Check for YouTube
    const youtubeId = extractYouTubeId(url)
    if (youtubeId) {
      this.detectedVideoType = "youtube"
      this.detectedVideoData = { id: youtubeId }
      const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
      this.videoPreviewTarget.innerHTML = `
        <div class="flex gap-3">
          <div class="relative flex-shrink-0 w-32 h-18 rounded overflow-hidden bg-[var(--theme-bg-tertiary)]">
            <img
              src="${thumbnailUrl}"
              alt="Video thumbnail"
              class="w-full h-full object-cover"
              onerror="this.style.display='none'"
            >
            <div class="absolute inset-0 flex items-center justify-center">
              <svg class="w-10 h-10 text-red-600 drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
          </div>
          <div class="flex flex-col justify-center">
            <div class="font-medium text-[var(--theme-text-primary)]">YouTube Video</div>
            <div class="text-xs text-[var(--theme-text-muted)]">ID: ${youtubeId}</div>
          </div>
        </div>
      `
      this.insertVideoBtnTarget.disabled = false
      return
    }

    // Check for video file
    const videoExtensions = [".mp4", ".webm", ".mkv", ".mov", ".avi", ".m4v", ".ogv"]
    const isVideoFile = videoExtensions.some(ext => url.toLowerCase().endsWith(ext))

    if (isVideoFile) {
      this.detectedVideoType = "file"
      this.detectedVideoData = { url: url }
      const filename = url.split("/").pop()
      this.videoPreviewTarget.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-8 h-8 text-[var(--theme-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div class="font-medium text-[var(--theme-text-primary)]">Video File</div>
            <div class="text-xs text-[var(--theme-text-muted)] truncate max-w-[350px]">${escapeHtml(filename)}</div>
          </div>
        </div>
      `
      this.insertVideoBtnTarget.disabled = false
      return
    }

    // Unknown format
    this.detectedVideoType = null
    this.detectedVideoData = null
    this.videoPreviewTarget.innerHTML = '<span class="text-[var(--theme-warning)]">Unknown format. Enter a YouTube URL or video file path.</span>'
    this.insertVideoBtnTarget.disabled = true
  }

  onVideoUrlKeydown(event) {
    if (event.key === "Enter" && !this.insertVideoBtnTarget.disabled) {
      event.preventDefault()
      this.insertVideo()
    }
  }

  insertVideo() {
    if (!this.hasTextareaTarget || !this.detectedVideoType) {
      this.videoDialogTarget.close()
      return
    }

    let embedCode

    if (this.detectedVideoType === "youtube") {
      embedCode = `<div class="embed-container">
  <iframe
    src="https://www.youtube.com/embed/${this.detectedVideoData.id}"
    title="YouTube video player"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen>
  </iframe>
</div>`
    } else if (this.detectedVideoType === "file") {
      const url = this.detectedVideoData.url
      const ext = url.split(".").pop().toLowerCase()
      const mimeTypes = {
        mp4: "video/mp4",
        webm: "video/webm",
        mkv: "video/x-matroska",
        mov: "video/quicktime",
        avi: "video/x-msvideo",
        m4v: "video/x-m4v",
        ogv: "video/ogg"
      }
      const mimeType = mimeTypes[ext] || "video/mp4"

      embedCode = `<video controls class="video-player">
  <source src="${escapeHtml(url)}" type="${mimeType}">
  Your browser does not support the video tag.
</video>`
    }

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
    this.videoDialogTarget.close()
  }

  // YouTube Search
  onYoutubeSearchKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.searchYoutube()
    } else if (event.key === "ArrowDown" && this.youtubeSearchResults.length > 0) {
      event.preventDefault()
      this.selectedYoutubeIndex = 0
      this.renderYoutubeResults()
      this.youtubeSearchResultsTarget.querySelector("[data-index='0']")?.focus()
    }
  }

  async searchYoutube() {
    const query = this.youtubeSearchInputTarget.value.trim()

    if (!query) {
      this.youtubeSearchStatusTarget.textContent = window.t("status.please_enter_keywords")
      return
    }

    if (!this.youtubeApiEnabled) {
      this.youtubeSearchStatusTarget.innerHTML = `<span class="text-amber-500">${window.t("status.youtube_not_configured_js")}</span>`
      return
    }

    this.youtubeSearchStatusTarget.textContent = window.t("status.searching")
    this.youtubeSearchBtnTarget.disabled = true
    this.youtubeSearchResultsTarget.innerHTML = ""

    try {
      const response = await fetch(`/youtube/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data.error) {
        this.youtubeSearchStatusTarget.innerHTML = `<span class="text-red-500">${data.error}</span>`
        this.youtubeSearchResults = []
      } else {
        this.youtubeSearchResults = data.videos || []
        if (this.youtubeSearchResults.length === 0) {
          this.youtubeSearchStatusTarget.textContent = window.t("status.no_videos_found")
        } else {
          this.youtubeSearchStatusTarget.textContent = window.t("status.found_videos", { count: this.youtubeSearchResults.length })
        }
        this.selectedYoutubeIndex = -1
        this.renderYoutubeResults()
      }
    } catch (error) {
      console.error("YouTube search error:", error)
      this.youtubeSearchStatusTarget.innerHTML = `<span class="text-red-500">${window.t("status.search_failed_retry")}</span>`
      this.youtubeSearchResults = []
    } finally {
      this.youtubeSearchBtnTarget.disabled = false
    }
  }

  renderYoutubeResults() {
    if (this.youtubeSearchResults.length === 0) {
      this.youtubeSearchResultsTarget.innerHTML = ""
      return
    }

    this.youtubeSearchResultsTarget.innerHTML = this.youtubeSearchResults.map((video, index) => {
      const isSelected = index === this.selectedYoutubeIndex
      const selectedClass = isSelected ? "ring-2 ring-[var(--theme-accent)]" : ""

      return `
        <button
          type="button"
          data-index="${index}"
          data-video-id="${video.id}"
          data-video-title="${escapeHtml(video.title)}"
          data-action="click->app#selectYoutubeVideo keydown->app#onYoutubeResultKeydown"
          class="flex flex-col rounded-lg overflow-hidden bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-hover)] transition-colors ${selectedClass} focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]"
        >
          <div class="relative aspect-video bg-[var(--theme-bg-tertiary)]">
            <img
              src="${video.thumbnail}"
              alt="${escapeHtml(video.title)}"
              class="w-full h-full object-cover"
              onerror="this.style.display='none'"
            >
            <div class="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
              <svg class="w-12 h-12 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
          </div>
          <div class="p-2">
            <div class="text-xs font-medium text-[var(--theme-text-primary)] line-clamp-2">${escapeHtml(video.title)}</div>
            <div class="text-xs text-[var(--theme-text-muted)] truncate mt-0.5">${escapeHtml(video.channel)}</div>
          </div>
        </button>
      `
    }).join("")
  }

  onYoutubeResultKeydown(event) {
    const currentIndex = parseInt(event.currentTarget.dataset.index)

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault()
      const nextIndex = Math.min(currentIndex + (event.key === "ArrowDown" ? 2 : 1), this.youtubeSearchResults.length - 1)
      this.selectedYoutubeIndex = nextIndex
      this.renderYoutubeResults()
      this.youtubeSearchResultsTarget.querySelector(`[data-index='${nextIndex}']`)?.focus()
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault()
      const prevIndex = Math.max(currentIndex - (event.key === "ArrowUp" ? 2 : 1), 0)
      if (event.key === "ArrowUp" && currentIndex < 2) {
        this.youtubeSearchInputTarget.focus()
        this.selectedYoutubeIndex = -1
        this.renderYoutubeResults()
      } else {
        this.selectedYoutubeIndex = prevIndex
        this.renderYoutubeResults()
        this.youtubeSearchResultsTarget.querySelector(`[data-index='${prevIndex}']`)?.focus()
      }
    } else if (event.key === "Enter") {
      event.preventDefault()
      this.selectYoutubeVideo(event)
    } else if (event.key === "Escape") {
      this.youtubeSearchInputTarget.focus()
      this.selectedYoutubeIndex = -1
      this.renderYoutubeResults()
    }
  }

  selectYoutubeVideo(event) {
    const videoId = event.currentTarget.dataset.videoId
    const videoTitle = event.currentTarget.dataset.videoTitle || "YouTube video"

    if (!videoId || !this.hasTextareaTarget) {
      return
    }

    const embedCode = `<div class="embed-container">
  <iframe
    src="https://www.youtube.com/embed/${videoId}"
    title="${videoTitle}"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen>
  </iframe>
</div>`

    const textarea = this.textareaTarget
    const cursorPos = textarea.selectionStart
    const text = textarea.value
    const before = text.substring(0, cursorPos)
    const after = text.substring(cursorPos)

    const prefix = before.length > 0 && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : ""
    const suffix = after.length > 0 && !after.startsWith("\n\n") ? (after.startsWith("\n") ? "\n" : "\n\n") : ""

    textarea.value = before + prefix + embedCode + suffix + after

    const newCursorPos = before.length + prefix.length + embedCode.length
    textarea.focus()
    textarea.setSelectionRange(newCursorPos, newCursorPos)

    this.scheduleAutoSave()
    this.updatePreview()
    this.videoDialogTarget.close()
  }

  // New Note/Folder
  newNote() {
    // Show the note type selector dialog
    this.newItemParent = ""
    this.showDialogCentered(this.noteTypeDialogTarget)
  }

  closeNoteTypeDialog() {
    this.noteTypeDialogTarget.close()
  }

  selectNoteTypeEmpty() {
    this.noteTypeDialogTarget.close()
    this.newItemType = "note"
    this.newItemTitleTarget.textContent = window.t("dialogs.new_item.new_note")
    this.newItemInputTarget.value = ""
    this.newItemInputTarget.placeholder = window.t("dialogs.new_item.note_placeholder")
    this.showNewItemDialogAtPosition()
    this.newItemInputTarget.focus()
  }

  selectNoteTypeHugo() {
    this.noteTypeDialogTarget.close()
    this.newItemType = "hugo"
    this.newItemTitleTarget.textContent = window.t("dialogs.note_type.new_hugo_post")
    this.newItemInputTarget.value = ""
    this.newItemInputTarget.placeholder = window.t("dialogs.new_item.note_placeholder")
    this.showNewItemDialogAtPosition()
    this.newItemInputTarget.focus()
  }

  showNewItemDialogAtPosition() {
    // If coming from context menu, position near the click point
    if (this.contextMenuContextX && this.contextMenuContextY) {
      this.positionDialogNearPoint(this.newItemDialogTarget, this.contextMenuContextX, this.contextMenuContextY)
      this.contextMenuContextX = null
      this.contextMenuContextY = null
    } else {
      this.showDialogCentered(this.newItemDialogTarget)
    }
  }

  newFolder() {
    this.newItemType = "folder"
    this.newItemParent = ""
    this.newItemTitleTarget.textContent = window.t("dialogs.new_item.new_folder")
    this.newItemInputTarget.value = ""
    this.newItemInputTarget.placeholder = window.t("dialogs.new_item.folder_placeholder")
    this.showDialogCentered(this.newItemDialogTarget)
    this.newItemInputTarget.focus()
  }

  closeNewItemDialog() {
    this.newItemDialogTarget.close()
  }

  async submitNewItem(event) {
    event.preventDefault()
    const name = this.newItemInputTarget.value.trim()
    if (!name) return

    const basePath = this.newItemParent ? `${this.newItemParent}/${name}` : name

    try {
      if (this.newItemType === "hugo") {
        // Create Hugo blog post with directory structure YYYY/MM/DD/slug/index.md
        const { notePath, content } = generateHugoBlogPost(name)

        const response = await fetch(`/notes/${encodePath(notePath)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": this.csrfToken
          },
          body: JSON.stringify({ content, create_directories: true })
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || window.t("errors.failed_to_create"))
        }

        // Expand the parent folders
        const pathParts = notePath.split("/")
        let expandPath = ""
        for (let i = 0; i < pathParts.length - 1; i++) {
          expandPath = expandPath ? `${expandPath}/${pathParts[i]}` : pathParts[i]
          this.expandedFolders.add(expandPath)
        }

        await this.refreshTree()
        await this.loadFile(notePath)
      } else if (this.newItemType === "note") {
        const notePath = basePath.endsWith(".md") ? basePath : `${basePath}.md`
        const response = await fetch(`/notes/${encodePath(notePath)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": this.csrfToken
          },
          body: JSON.stringify({ content: `# ${name}\n\n` })
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || window.t("errors.failed_to_create"))
        }

        await this.refreshTree()
        await this.loadFile(notePath)
      } else {
        // Folder
        const response = await fetch(`/folders/${encodePath(basePath)}`, {
          method: "POST",
          headers: {
            "X-CSRF-Token": this.csrfToken
          }
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || window.t("errors.failed_to_create"))
        }

        this.expandedFolders.add(basePath)
        await this.refreshTree()
      }

      this.newItemDialogTarget.close()
    } catch (error) {
      console.error("Error creating item:", error)
      alert(error.message)
    }
  }

  // Context Menu
  showContextMenu(event) {
    event.preventDefault()
    this.contextItem = {
      path: event.currentTarget.dataset.path,
      type: event.currentTarget.dataset.type
    }

    // Store click position for positioning dialogs near the click
    this.contextClickX = event.clientX
    this.contextClickY = event.clientY

    // Show/hide "New Note" button based on item type
    if (this.contextItem.type === "folder") {
      this.newNoteBtnTarget.classList.remove("hidden")
      this.newNoteBtnTarget.classList.add("flex")
    } else {
      this.newNoteBtnTarget.classList.add("hidden")
      this.newNoteBtnTarget.classList.remove("flex")
    }

    const menu = this.contextMenuTarget
    menu.classList.remove("hidden")
    menu.style.left = `${event.clientX}px`
    menu.style.top = `${event.clientY}px`

    // Ensure menu doesn't go off-screen
    const rect = menu.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 10}px`
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 10}px`
    }
  }

  newNoteInFolder() {
    if (!this.contextItem || this.contextItem.type !== "folder") return

    this.newItemParent = this.contextItem.path
    this.contextMenuContextX = this.contextClickX
    this.contextMenuContextY = this.contextClickY

    // Expand the folder
    this.expandedFolders.add(this.contextItem.path)
    this.renderTree()

    // Show note type selector
    this.positionDialogNearPoint(this.noteTypeDialogTarget, this.contextClickX, this.contextClickY)
  }

  setupContextMenuClose() {
    this.boundContextMenuClose = () => {
      this.contextMenuTarget.classList.add("hidden")
    }
    document.addEventListener("click", this.boundContextMenuClose)
  }

  setupDialogClickOutside() {
    // Close dialog when clicking on backdrop (outside the dialog content)
    const dialogs = [
      this.renameDialogTarget,
      this.newItemDialogTarget,
      this.tableDialogTarget,
      this.imageDialogTarget,
      this.helpDialogTarget,
      this.codeDialogTarget,
      this.customizeDialogTarget,
      this.fileFinderDialogTarget,
      this.contentSearchDialogTarget,
      this.videoDialogTarget
    ]

    dialogs.forEach(dialog => {
      if (!dialog) return

      dialog.addEventListener("click", (event) => {
        // If click is directly on the dialog (backdrop area), close it
        if (event.target === dialog) {
          dialog.close()
        }
      })
    })
  }

  renameItem() {
    if (!this.contextItem) return

    const name = this.contextItem.path.split("/").pop().replace(/\.md$/, "")
    this.renameInputTarget.value = name
    this.positionDialogNearPoint(this.renameDialogTarget, this.contextClickX, this.contextClickY)
    this.renameInputTarget.focus()
    this.renameInputTarget.select()
  }

  closeRenameDialog() {
    this.renameDialogTarget.close()
  }

  async submitRename(event) {
    event.preventDefault()
    if (!this.contextItem) return

    const newName = this.renameInputTarget.value.trim()
    if (!newName) return

    const oldPath = this.contextItem.path
    const pathParts = oldPath.split("/")
    pathParts.pop()

    let newPath
    if (this.contextItem.type === "file") {
      newPath = [...pathParts, `${newName}.md`].join("/")
      if (pathParts.length === 0) newPath = `${newName}.md`
    } else {
      newPath = [...pathParts, newName].join("/")
      if (pathParts.length === 0) newPath = newName
    }

    try {
      const endpoint = this.contextItem.type === "file" ? "notes" : "folders"
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
        throw new Error(data.error || window.t("errors.failed_to_rename"))
      }

      if (this.currentFile === oldPath) {
        this.currentFile = newPath
        this.currentPathTarget.textContent = newPath.replace(/\.md$/, "")
      }

      await this.refreshTree()
      this.renameDialogTarget.close()
    } catch (error) {
      console.error("Error renaming:", error)
      alert(error.message)
    }
  }

  async deleteItem() {
    if (!this.contextItem) return

    const confirmMsg = this.contextItem.type === "file"
      ? window.t("confirm.delete_note")
      : window.t("confirm.delete_folder")

    if (!confirm(confirmMsg)) return

    try {
      const endpoint = this.contextItem.type === "file" ? "notes" : "folders"
      const response = await fetch(`/${endpoint}/${encodePath(this.contextItem.path)}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": this.csrfToken
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || window.t("errors.failed_to_delete"))
      }

      if (this.currentFile === this.contextItem.path) {
        this.currentFile = null
        this.currentPathTarget.textContent = window.t("editor.select_note")
        this.editorPlaceholderTarget.classList.remove("hidden")
        this.editorTarget.classList.add("hidden")
        this.hideStatsPanel()
      }

      await this.refreshTree()
    } catch (error) {
      console.error("Error deleting:", error)
      alert(error.message)
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
      // Ctrl/Cmd + N: New note
      if ((event.ctrlKey || event.metaKey) && event.key === "n") {
        event.preventDefault()
        this.newNote()
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

      // Escape: Close menus and dialogs
      if (event.key === "Escape") {
        // Close context menus
        this.contextMenuTarget.classList.add("hidden")
        if (this.hasTableCellMenuTarget) {
          this.tableCellMenuTarget.classList.add("hidden")
        }

        // Close any open dialogs
        if (this.hasRenameDialogTarget && this.renameDialogTarget.open) {
          this.renameDialogTarget.close()
        }
        if (this.hasNewItemDialogTarget && this.newItemDialogTarget.open) {
          this.newItemDialogTarget.close()
        }
        if (this.hasTableDialogTarget && this.tableDialogTarget.open) {
          this.tableDialogTarget.close()
        }
        if (this.hasImageDialogTarget && this.imageDialogTarget.open) {
          this.imageDialogTarget.close()
        }
        if (this.hasHelpDialogTarget && this.helpDialogTarget.open) {
          this.helpDialogTarget.close()
        }
        if (this.hasCodeDialogTarget && this.codeDialogTarget.open) {
          this.codeDialogTarget.close()
        }
        if (this.hasCustomizeDialogTarget && this.customizeDialogTarget.open) {
          this.customizeDialogTarget.close()
        }
        if (this.hasFileFinderDialogTarget && this.fileFinderDialogTarget.open) {
          this.fileFinderDialogTarget.close()
        }
        if (this.hasContentSearchDialogTarget && this.contentSearchDialogTarget.open) {
          this.contentSearchDialogTarget.close()
        }
        if (this.hasVideoDialogTarget && this.videoDialogTarget.open) {
          this.videoDialogTarget.close()
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

  // === Document Stats ===

  showStatsPanel() {
    if (this.hasStatsPanelTarget) {
      this.statsPanelTarget.classList.remove("hidden")
    }
  }

  hideStatsPanel() {
    if (this.hasStatsPanelTarget) {
      this.statsPanelTarget.classList.add("hidden")
    }
  }

  scheduleStatsUpdate() {
    // Debounce stats update to avoid slowing down typing
    if (this.statsUpdateTimeout) {
      clearTimeout(this.statsUpdateTimeout)
    }
    this.statsUpdateTimeout = setTimeout(() => this.updateStats(), 500)
  }

  updateStats() {
    if (!this.hasTextareaTarget || !this.hasStatsPanelTarget) return

    const text = this.textareaTarget.value
    const stats = calculateStats(text)

    // Update display
    if (this.hasStatsWordsTarget) {
      this.statsWordsTarget.textContent = stats.wordCount.toLocaleString()
    }
    if (this.hasStatsCharsTarget) {
      this.statsCharsTarget.textContent = stats.charCount.toLocaleString()
    }
    if (this.hasStatsSizeTarget) {
      this.statsSizeTarget.textContent = formatFileSize(stats.byteSize)
    }
    if (this.hasStatsReadTimeTarget) {
      this.statsReadTimeTarget.textContent = formatReadTime(stats.readTimeMinutes)
    }
  }

}
