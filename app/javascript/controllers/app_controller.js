import { Controller } from "@hotwired/stimulus"
import { marked } from "marked"

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
    "tableDialog",
    "tableGrid",
    "tableSize",
    "tableCellMenu",
    "moveColLeftBtn",
    "moveColRightBtn",
    "deleteColBtn",
    "moveRowUpBtn",
    "moveRowDownBtn",
    "deleteRowBtn",
    "imageBtn",
    "imageDialog",
    "imageSearch",
    "imageGrid",
    "imageOptions",
    "selectedImageName",
    "imageAlt",
    "imageLink",
    "s3Option",
    "uploadToS3",
    "imageLoading",
    "imageLoadingText",
    "insertImageBtn",
    "imageTabLocal",
    "imageTabWeb",
    "imageTabGoogle",
    "imageTabPinterest",
    "imageLocalPanel",
    "imageWebPanel",
    "imageGooglePanel",
    "imagePinterestPanel",
    "webImageSearch",
    "webSearchBtn",
    "webImageStatus",
    "webImageGrid",
    "googleImageSearch",
    "googleSearchBtn",
    "googleImageStatus",
    "googleImageGrid",
    "pinterestImageSearch",
    "pinterestSearchBtn",
    "pinterestImageStatus",
    "pinterestImageGrid",
    "s3ExternalOption",
    "reuploadToS3",
    "resizeOptionLocal",
    "resizeSelectLocal",
    "resizeOptionExternal",
    "resizeSelectExternal",
    "codeDialog",
    "codeLanguage",
    "codeContent",
    "codeSuggestions",
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
    "youtubeSearchResults"
  ]

  static values = {
    tree: Array
  }

  connect() {
    this.currentFile = null
    this.expandedFolders = new Set()
    this.saveTimeout = null
    this.contextItem = null
    this.newItemType = null
    this.newItemParent = ""

    // Context menu click position (for positioning dialogs near click)
    this.contextClickX = 0
    this.contextClickY = 0

    // Table editor state
    this.tableData = []
    this.tableEditMode = false  // true if editing existing table
    this.tableStartPos = 0      // position in textarea where table starts
    this.tableEndPos = 0        // position in textarea where table ends
    this.selectedCellRow = 0    // row of right-clicked cell
    this.selectedCellCol = 0    // column of right-clicked cell

    // Image picker state
    this.imagesEnabled = false
    this.s3Enabled = false
    this.webSearchEnabled = false
    this.googleImagesEnabled = false
    this.pinterestEnabled = false
    this.selectedImage = null
    this.imageSearchTimeout = null
    this.currentImageTab = "local"
    this.webImageResults = []
    this.googleImageResults = []
    this.googleImageNextStart = 0
    this.googleImageLoading = false
    this.googleImageQuery = ""
    this.pinterestImageResults = []

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
    this.currentFont = localStorage.getItem("editorFont") || "cascadia-code"
    this.currentFontSize = parseInt(localStorage.getItem("editorFontSize")) || 14

    // Preview zoom state
    this.previewZoomLevels = [50, 75, 90, 100, 110, 125, 150, 175, 200]
    this.previewZoom = parseInt(localStorage.getItem("previewZoom")) || 100

    // Sidebar/Explorer visibility
    this.sidebarVisible = localStorage.getItem("sidebarVisible") !== "false"

    // Typewriter mode - keeps cursor in upper-middle area
    this.typewriterModeEnabled = localStorage.getItem("typewriterMode") === "true"

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
    this.loadImagesConfig()
    this.applyEditorSettings()
    this.applyPreviewZoom()
    this.applySidebarVisibility()
    this.applyTypewriterMode()

    // Configure marked
    marked.setOptions({
      breaks: true,
      gfm: true
    })
  }

  disconnect() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
  }

  // Tree Rendering
  renderTree() {
    this.fileTreeTarget.innerHTML = this.buildTreeHTML(this.treeValue)
  }

  buildTreeHTML(items, depth = 0) {
    if (!items || items.length === 0) {
      if (depth === 0) {
        return `<div class="text-sm text-zinc-400 dark:text-zinc-500 p-2">No notes yet</div>`
      }
      return ""
    }

    return items.map(item => {
      if (item.type === "folder") {
        const isExpanded = this.expandedFolders.has(item.path)
        return `
          <div class="tree-folder" data-path="${this.escapeHtml(item.path)}">
            <div class="tree-item drop-target" draggable="true"
              data-action="click->app#toggleFolder contextmenu->app#showContextMenu dragstart->app#onDragStart dragover->app#onDragOver dragenter->app#onDragEnter dragleave->app#onDragLeave drop->app#onDrop dragend->app#onDragEnd"
              data-path="${this.escapeHtml(item.path)}" data-type="folder">
              <svg class="tree-chevron ${isExpanded ? 'expanded' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <svg class="tree-icon text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span class="truncate">${this.escapeHtml(item.name)}</span>
            </div>
            <div class="tree-children ${isExpanded ? '' : 'hidden'}">
              ${this.buildTreeHTML(item.children, depth + 1)}
            </div>
          </div>
        `
      } else {
        const isSelected = this.currentFile === item.path
        return `
          <div class="tree-item ${isSelected ? 'selected' : ''}" draggable="true"
            data-action="click->app#selectFile contextmenu->app#showContextMenu dragstart->app#onDragStart dragend->app#onDragEnd"
            data-path="${this.escapeHtml(item.path)}" data-type="file">
            <svg class="tree-icon text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="truncate">${this.escapeHtml(item.name)}</span>
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
      const response = await fetch(`/${endpoint}/${this.encodePath(oldPath)}/rename`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfToken
        },
        body: JSON.stringify({ new_path: newPath })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to move")
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

  async loadFile(path) {
    try {
      const response = await fetch(`/notes/${this.encodePath(path)}`, {
        headers: { "Accept": "application/json" }
      })

      if (!response.ok) {
        throw new Error("Failed to load note")
      }

      const data = await response.json()
      this.currentFile = path
      this.currentPathTarget.textContent = path.replace(/\.md$/, "")

      this.showEditor(data.content)
      this.renderTree()
    } catch (error) {
      console.error("Error loading file:", error)
      this.showSaveStatus("Error loading note", true)
    }
  }

  showEditor(content) {
    this.editorPlaceholderTarget.classList.add("hidden")
    this.editorTarget.classList.remove("hidden")
    this.editorToolbarTarget.classList.remove("hidden")
    this.editorToolbarTarget.classList.add("flex")
    this.textareaTarget.value = content
    this.textareaTarget.focus()
    this.updatePreview()
  }

  onTextareaInput() {
    this.scheduleAutoSave()
    this.updatePreview()
    this.checkTableAtCursor()
    this.maintainTypewriterScroll()
  }

  // Check if cursor is in a markdown table
  checkTableAtCursor() {
    if (!this.hasTextareaTarget) return

    const text = this.textareaTarget.value
    const cursorPos = this.textareaTarget.selectionStart
    const tableInfo = this.findTableAtPosition(text, cursorPos)

    if (tableInfo) {
      this.tableHintTarget.classList.remove("hidden")
    } else {
      this.tableHintTarget.classList.add("hidden")
    }
  }

  // Find markdown table at given position
  findTableAtPosition(text, pos) {
    const lines = text.split("\n")
    let lineStart = 0
    let currentLine = 0

    // Find which line the cursor is on
    for (let i = 0; i < lines.length; i++) {
      const lineEnd = lineStart + lines[i].length
      if (pos >= lineStart && pos <= lineEnd) {
        currentLine = i
        break
      }
      lineStart = lineEnd + 1 // +1 for newline
    }

    // Check if current line looks like a table row
    const line = lines[currentLine]
    if (!line || !line.trim().startsWith("|")) {
      return null
    }

    // Find table boundaries (search up and down for table rows)
    let startLine = currentLine
    let endLine = currentLine

    // Search upward
    while (startLine > 0 && lines[startLine - 1].trim().startsWith("|")) {
      startLine--
    }

    // Search downward
    while (endLine < lines.length - 1 && lines[endLine + 1].trim().startsWith("|")) {
      endLine++
    }

    // Need at least 2 lines (header + separator)
    if (endLine - startLine < 1) {
      return null
    }

    // Calculate positions
    let startPos = 0
    for (let i = 0; i < startLine; i++) {
      startPos += lines[i].length + 1
    }

    let endPos = startPos
    for (let i = startLine; i <= endLine; i++) {
      endPos += lines[i].length + 1
    }
    endPos-- // Remove trailing newline

    return {
      startLine,
      endLine,
      startPos,
      endPos,
      lines: lines.slice(startLine, endLine + 1)
    }
  }

  // Parse markdown table into 2D array
  parseMarkdownTable(lines) {
    const rows = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Skip separator row (|---|---|)
      if (/^\|[\s\-:]+\|$/.test(line) || /^\|(\s*:?-+:?\s*\|)+$/.test(line)) {
        continue
      }

      // Split by | and remove empty first/last elements
      const cells = line.split("|")
        .slice(1, -1)
        .map(cell => cell.trim())

      if (cells.length > 0) {
        rows.push(cells)
      }
    }

    return rows
  }

  // Generate markdown table from 2D array
  generateMarkdownTable(data) {
    if (!data || data.length === 0) return ""

    const colCount = Math.max(...data.map(row => row.length))

    // Normalize all rows to same column count
    const normalizedData = data.map(row => {
      const newRow = [...row]
      while (newRow.length < colCount) {
        newRow.push("")
      }
      return newRow
    })

    // Calculate column widths
    const widths = []
    for (let col = 0; col < colCount; col++) {
      widths[col] = Math.max(3, ...normalizedData.map(row => (row[col] || "").length))
    }

    // Build table
    const lines = []

    // Header row
    const headerCells = normalizedData[0].map((cell, i) => cell.padEnd(widths[i]))
    lines.push("| " + headerCells.join(" | ") + " |")

    // Separator row
    const separatorCells = widths.map(w => "-".repeat(w))
    lines.push("| " + separatorCells.join(" | ") + " |")

    // Data rows
    for (let i = 1; i < normalizedData.length; i++) {
      const cells = normalizedData[i].map((cell, j) => cell.padEnd(widths[j]))
      lines.push("| " + cells.join(" | ") + " |")
    }

    return lines.join("\n")
  }

  scheduleAutoSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
    this.showSaveStatus("Unsaved changes")
    this.saveTimeout = setTimeout(() => this.saveNow(), 1000)
  }

  async saveNow() {
    if (!this.currentFile || !this.hasTextareaTarget) return

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }

    const content = this.textareaTarget.value

    try {
      const response = await fetch(`/notes/${this.encodePath(this.currentFile)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfToken
        },
        body: JSON.stringify({ content })
      })

      if (!response.ok) {
        throw new Error("Failed to save")
      }

      this.showSaveStatus("Saved")
      setTimeout(() => this.showSaveStatus(""), 2000)
    } catch (error) {
      console.error("Error saving:", error)
      this.showSaveStatus("Error saving", true)
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

  // Table Editor
  openTableEditor() {
    // Check if cursor is in existing table
    if (this.hasTextareaTarget) {
      const text = this.textareaTarget.value
      const cursorPos = this.textareaTarget.selectionStart
      const tableInfo = this.findTableAtPosition(text, cursorPos)

      if (tableInfo) {
        // Edit existing table
        this.tableEditMode = true
        this.tableStartPos = tableInfo.startPos
        this.tableEndPos = tableInfo.endPos
        this.tableData = this.parseMarkdownTable(tableInfo.lines)

        // Ensure at least 1 row
        if (this.tableData.length === 0) {
          this.tableData = [["Header 1", "Header 2", "Header 3"]]
        }
      } else {
        // New table with default 3x3
        this.tableEditMode = false
        this.tableData = [
          ["Header 1", "Header 2", "Header 3"],
          ["", "", ""],
          ["", "", ""]
        ]
      }
    } else {
      this.tableEditMode = false
      this.tableData = [
        ["Header 1", "Header 2", "Header 3"],
        ["", "", ""],
        ["", "", ""]
      ]
    }

    this.renderTableGrid()
    this.tableDialogTarget.showModal()
  }

  closeTableDialog() {
    this.tableDialogTarget.close()
  }

  renderTableGrid() {
    const rows = this.tableData.length
    const cols = this.tableData[0]?.length || 3

    this.tableSizeTarget.textContent = `${cols} x ${rows}`

    let html = '<table class="table-editor-grid w-full">'

    for (let r = 0; r < rows; r++) {
      html += '<tr>'
      for (let c = 0; c < cols; c++) {
        const value = this.tableData[r]?.[c] || ""
        const isHeader = r === 0
        const cellClass = isHeader ? "font-semibold bg-zinc-100 dark:bg-zinc-700" : ""
        html += `
          <td class="${cellClass}" data-row="${r}" data-col="${c}" data-action="contextmenu->app#showTableCellMenu">
            <input
              type="text"
              value="${this.escapeHtml(value)}"
              data-row="${r}"
              data-col="${c}"
              data-action="input->app#onTableCellInput contextmenu->app#showTableCellMenu"
              class="w-full px-2 py-1 text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
              placeholder="${isHeader ? 'Header' : ''}"
            >
          </td>
        `
      }
      html += '</tr>'
    }

    html += '</table>'
    this.tableGridTarget.innerHTML = html
  }

  onTableCellInput(event) {
    const row = parseInt(event.target.dataset.row)
    const col = parseInt(event.target.dataset.col)
    const value = event.target.value

    // Ensure row exists
    while (this.tableData.length <= row) {
      this.tableData.push([])
    }

    // Ensure col exists in row
    while (this.tableData[row].length <= col) {
      this.tableData[row].push("")
    }

    this.tableData[row][col] = value
  }

  addTableColumn() {
    const cols = this.tableData[0]?.length || 0
    for (let i = 0; i < this.tableData.length; i++) {
      this.tableData[i].push(i === 0 ? `Header ${cols + 1}` : "")
    }
    this.renderTableGrid()
  }

  removeTableColumn() {
    if (!this.tableData[0] || this.tableData[0].length <= 1) return

    for (let i = 0; i < this.tableData.length; i++) {
      this.tableData[i].pop()
    }
    this.renderTableGrid()
  }

  addTableRow() {
    const cols = this.tableData[0]?.length || 3
    this.tableData.push(new Array(cols).fill(""))
    this.renderTableGrid()
  }

  removeTableRow() {
    if (this.tableData.length <= 1) return
    this.tableData.pop()
    this.renderTableGrid()
  }

  insertTable() {
    if (!this.hasTextareaTarget || !this.tableData || this.tableData.length === 0) {
      this.tableDialogTarget.close()
      return
    }

    const markdownTable = this.generateMarkdownTable(this.tableData)
    const textarea = this.textareaTarget
    const text = textarea.value

    if (this.tableEditMode) {
      // Replace existing table
      const before = text.substring(0, this.tableStartPos)
      const after = text.substring(this.tableEndPos)
      textarea.value = before + markdownTable + after

      // Position cursor after table
      const newPos = this.tableStartPos + markdownTable.length
      textarea.setSelectionRange(newPos, newPos)
    } else {
      // Insert at cursor
      const cursorPos = textarea.selectionStart
      const before = text.substring(0, cursorPos)
      const after = text.substring(cursorPos)

      // Add newlines if needed
      const prefix = before.length > 0 && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : ""
      const suffix = after.length > 0 && !after.startsWith("\n\n") ? (after.startsWith("\n") ? "\n" : "\n\n") : ""

      textarea.value = before + prefix + markdownTable + suffix + after

      // Position cursor after table
      const newPos = before.length + prefix.length + markdownTable.length
      textarea.setSelectionRange(newPos, newPos)
    }

    textarea.focus()
    this.scheduleAutoSave()
    this.updatePreview()
    this.tableDialogTarget.close()
  }

  // Table Cell Context Menu
  showTableCellMenu(event) {
    event.preventDefault()
    event.stopPropagation()

    // Get cell position from the target or its parent
    let target = event.target
    if (target.tagName === "INPUT") {
      target = target.closest("td")
    }

    this.selectedCellRow = parseInt(target.dataset.row)
    this.selectedCellCol = parseInt(target.dataset.col)

    const rows = this.tableData.length
    const cols = this.tableData[0]?.length || 0

    // Enable/disable buttons based on position
    // Can't move left if at first column
    this.moveColLeftBtnTarget.classList.toggle("opacity-50", this.selectedCellCol === 0)
    this.moveColLeftBtnTarget.disabled = this.selectedCellCol === 0

    // Can't move right if at last column
    this.moveColRightBtnTarget.classList.toggle("opacity-50", this.selectedCellCol >= cols - 1)
    this.moveColRightBtnTarget.disabled = this.selectedCellCol >= cols - 1

    // Can't delete column if only 1 column
    this.deleteColBtnTarget.classList.toggle("opacity-50", cols <= 1)
    this.deleteColBtnTarget.disabled = cols <= 1

    // Can't move up if at first row (header) or second row
    this.moveRowUpBtnTarget.classList.toggle("opacity-50", this.selectedCellRow <= 1)
    this.moveRowUpBtnTarget.disabled = this.selectedCellRow <= 1

    // Can't move down if at last row or header row
    this.moveRowDownBtnTarget.classList.toggle("opacity-50", this.selectedCellRow === 0 || this.selectedCellRow >= rows - 1)
    this.moveRowDownBtnTarget.disabled = this.selectedCellRow === 0 || this.selectedCellRow >= rows - 1

    // Can't delete row if only 1 row, and can't delete header row
    this.deleteRowBtnTarget.classList.toggle("opacity-50", rows <= 1 || this.selectedCellRow === 0)
    this.deleteRowBtnTarget.disabled = rows <= 1 || this.selectedCellRow === 0

    const menu = this.tableCellMenuTarget
    menu.classList.remove("hidden")
    menu.style.left = `${event.clientX}px`
    menu.style.top = `${event.clientY}px`

    // Ensure menu doesn't go off-screen
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect()
      if (rect.right > window.innerWidth) {
        menu.style.left = `${window.innerWidth - rect.width - 10}px`
      }
      if (rect.bottom > window.innerHeight) {
        menu.style.top = `${window.innerHeight - rect.height - 10}px`
      }
    })

    // Close menu when clicking elsewhere
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.add("hidden")
        document.removeEventListener("click", closeMenu)
      }
    }
    setTimeout(() => document.addEventListener("click", closeMenu), 0)
  }

  hideTableCellMenu() {
    this.tableCellMenuTarget.classList.add("hidden")
  }

  moveColumnLeft() {
    this.hideTableCellMenu()
    const col = this.selectedCellCol
    if (col <= 0) return

    for (let r = 0; r < this.tableData.length; r++) {
      const temp = this.tableData[r][col]
      this.tableData[r][col] = this.tableData[r][col - 1]
      this.tableData[r][col - 1] = temp
    }

    this.selectedCellCol = col - 1
    this.renderTableGrid()
  }

  moveColumnRight() {
    this.hideTableCellMenu()
    const col = this.selectedCellCol
    const cols = this.tableData[0]?.length || 0
    if (col >= cols - 1) return

    for (let r = 0; r < this.tableData.length; r++) {
      const temp = this.tableData[r][col]
      this.tableData[r][col] = this.tableData[r][col + 1]
      this.tableData[r][col + 1] = temp
    }

    this.selectedCellCol = col + 1
    this.renderTableGrid()
  }

  deleteColumnAt() {
    this.hideTableCellMenu()
    const cols = this.tableData[0]?.length || 0
    if (cols <= 1) return

    const col = this.selectedCellCol
    for (let r = 0; r < this.tableData.length; r++) {
      this.tableData[r].splice(col, 1)
    }

    this.renderTableGrid()
  }

  moveRowUp() {
    this.hideTableCellMenu()
    const row = this.selectedCellRow
    // Can't move header row (0) or the row right after header (1)
    if (row <= 1) return

    const temp = this.tableData[row]
    this.tableData[row] = this.tableData[row - 1]
    this.tableData[row - 1] = temp

    this.selectedCellRow = row - 1
    this.renderTableGrid()
  }

  moveRowDown() {
    this.hideTableCellMenu()
    const row = this.selectedCellRow
    const rows = this.tableData.length
    // Can't move header row or last row
    if (row === 0 || row >= rows - 1) return

    const temp = this.tableData[row]
    this.tableData[row] = this.tableData[row + 1]
    this.tableData[row + 1] = temp

    this.selectedCellRow = row + 1
    this.renderTableGrid()
  }

  deleteRowAt() {
    this.hideTableCellMenu()
    const rows = this.tableData.length
    const row = this.selectedCellRow
    // Can't delete if only 1 row or if it's the header row
    if (rows <= 1 || row === 0) return

    this.tableData.splice(row, 1)
    this.renderTableGrid()
  }

  // Image Picker
  async loadImagesConfig() {
    try {
      const response = await fetch("/images/config", {
        headers: { "Accept": "application/json" }
      })
      if (response.ok) {
        const config = await response.json()
        this.imagesEnabled = config.enabled
        this.s3Enabled = config.s3_enabled
        this.webSearchEnabled = config.web_search_enabled
        this.googleImagesEnabled = config.google_enabled
        this.pinterestEnabled = config.pinterest_enabled

        // Show image button if any image source is enabled
        if ((this.imagesEnabled || this.webSearchEnabled || this.googleImagesEnabled || this.pinterestEnabled) && this.hasImageBtnTarget) {
          this.imageBtnTarget.classList.remove("hidden")
        }
      }
    } catch (error) {
      console.error("Error loading images config:", error)
    }
  }

  async openImagePicker() {
    // Allow opening if any image source is enabled
    if (!this.imagesEnabled && !this.webSearchEnabled && !this.googleImagesEnabled && !this.pinterestEnabled) return

    this.selectedImage = null
    this.currentImageTab = "local"

    // Reset local tab
    if (this.hasImageSearchTarget) this.imageSearchTarget.value = ""
    this.imageAltTarget.value = ""
    this.imageLinkTarget.value = ""
    this.imageOptionsTarget.classList.add("hidden")
    this.insertImageBtnTarget.disabled = true

    // Reset Web Search tab
    if (this.hasWebImageSearchTarget) this.webImageSearchTarget.value = ""
    if (this.hasWebImageGridTarget) this.webImageGridTarget.innerHTML = ""
    if (this.hasWebImageStatusTarget) {
      this.webImageStatusTarget.textContent = "Enter keywords and click Search or press Enter"
    }
    this.webImageResults = []

    // Reset Google tab
    if (this.hasGoogleImageSearchTarget) this.googleImageSearchTarget.value = ""
    if (this.hasGoogleImageGridTarget) this.googleImageGridTarget.innerHTML = ""
    if (this.hasGoogleImageStatusTarget) {
      this.googleImageStatusTarget.textContent = "Enter keywords and click Search or press Enter"
    }
    this.googleImageResults = []
    this.googleImageNextStart = 0
    this.googleImageQuery = ""

    // Reset Pinterest tab
    if (this.hasPinterestImageSearchTarget) this.pinterestImageSearchTarget.value = ""
    if (this.hasPinterestImageGridTarget) this.pinterestImageGridTarget.innerHTML = ""
    if (this.hasPinterestImageStatusTarget) {
      this.pinterestImageStatusTarget.textContent = "Enter keywords and click Search or press Enter"
    }
    this.pinterestImageResults = []

    // Hide all S3 options initially
    if (this.hasS3OptionTarget) this.s3OptionTarget.classList.add("hidden")
    if (this.hasS3ExternalOptionTarget) this.s3ExternalOptionTarget.classList.add("hidden")
    if (this.hasUploadToS3Target) this.uploadToS3Target.checked = false
    if (this.hasReuploadToS3Target) this.reuploadToS3Target.checked = false

    // Show/hide tabs based on enabled features
    if (this.hasImageTabLocalTarget) {
      this.imageTabLocalTarget.classList.toggle("hidden", !this.imagesEnabled)
    }
    if (this.hasImageTabWebTarget) {
      this.imageTabWebTarget.classList.toggle("hidden", !this.webSearchEnabled)
    }
    if (this.hasImageTabGoogleTarget) {
      this.imageTabGoogleTarget.classList.toggle("hidden", !this.googleImagesEnabled)
    }
    // Pinterest is always shown

    // Set initial tab to first available
    let initialTab = "local"
    if (!this.imagesEnabled) {
      if (this.webSearchEnabled) {
        initialTab = "web"
      } else if (this.googleImagesEnabled) {
        initialTab = "google"
      } else {
        initialTab = "pinterest"
      }
    }

    // Switch to initial tab
    this.switchImageTab({ currentTarget: { dataset: { tab: initialTab } } })

    // Load local images if enabled
    if (this.imagesEnabled) {
      await this.loadImages()
    }

    this.imageDialogTarget.showModal()
  }

  closeImageDialog() {
    this.imageDialogTarget.close()
  }

  async loadImages(search = "") {
    try {
      const url = search ? `/images?search=${encodeURIComponent(search)}` : "/images"
      const response = await fetch(url, {
        headers: { "Accept": "application/json" }
      })

      if (!response.ok) {
        throw new Error("Failed to load images")
      }

      const images = await response.json()
      this.renderImageGrid(images)
    } catch (error) {
      console.error("Error loading images:", error)
      this.imageGridTarget.innerHTML = '<div class="image-grid-empty">Error loading images</div>'
    }
  }

  renderImageGrid(images) {
    if (!images || images.length === 0) {
      this.imageGridTarget.innerHTML = '<div class="image-grid-empty">No images found</div>'
      return
    }

    const html = images.map(image => {
      const dimensions = (image.width && image.height) ? `${image.width}x${image.height}` : ""
      return `
        <div
          class="image-grid-item ${this.selectedImage?.path === image.path ? 'selected' : ''}"
          data-action="click->app#selectImage"
          data-path="${this.escapeHtml(image.path)}"
          data-name="${this.escapeHtml(image.name)}"
          title="${this.escapeHtml(image.name)}${dimensions ? ` (${dimensions})` : ''}"
        >
          <img src="/images/preview/${this.encodePath(image.path)}" alt="${this.escapeHtml(image.name)}" loading="lazy">
          ${dimensions ? `<div class="image-dimensions">${dimensions}</div>` : ''}
        </div>
      `
    }).join("")

    this.imageGridTarget.innerHTML = html
  }

  onImageSearch() {
    // Debounce search
    if (this.imageSearchTimeout) {
      clearTimeout(this.imageSearchTimeout)
    }

    this.imageSearchTimeout = setTimeout(() => {
      this.loadImages(this.imageSearchTarget.value.trim())
    }, 300)
  }

  selectImage(event) {
    const item = event.currentTarget
    const path = item.dataset.path
    const name = item.dataset.name

    // Deselect previous in local grid
    this.imageGridTarget.querySelectorAll(".image-grid-item").forEach(el => {
      el.classList.remove("selected")
    })

    // Also deselect in external grids
    if (this.hasGoogleImageGridTarget) {
      this.googleImageGridTarget.querySelectorAll(".external-image-item").forEach(el => {
        el.classList.remove("ring-2", "ring-blue-500")
      })
    }
    if (this.hasPinterestImageGridTarget) {
      this.pinterestImageGridTarget.querySelectorAll(".external-image-item").forEach(el => {
        el.classList.remove("ring-2", "ring-blue-500")
      })
    }

    // Select new
    item.classList.add("selected")
    this.selectedImage = { path, name, type: "local" }

    // Show options
    this.imageOptionsTarget.classList.remove("hidden")
    this.selectedImageNameTarget.textContent = name
    this.insertImageBtnTarget.disabled = false

    // Show S3 option for local, hide external S3 option
    if (this.s3Enabled && this.hasS3OptionTarget) {
      this.s3OptionTarget.classList.remove("hidden")
    }
    if (this.hasS3ExternalOptionTarget) {
      this.s3ExternalOptionTarget.classList.add("hidden")
    }

    // Pre-fill alt text with filename (without extension)
    const altText = name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ")
    this.imageAltTarget.value = altText
  }

  selectExternalImage(event) {
    const item = event.currentTarget
    const url = item.dataset.url
    const thumbnail = item.dataset.thumbnail
    const title = item.dataset.title || "Image"
    const source = item.dataset.source || "external"

    // Deselect previous in all grids
    if (this.hasImageGridTarget) {
      this.imageGridTarget.querySelectorAll(".image-grid-item").forEach(el => {
        el.classList.remove("selected")
      })
    }
    if (this.hasGoogleImageGridTarget) {
      this.googleImageGridTarget.querySelectorAll(".external-image-item").forEach(el => {
        el.classList.remove("ring-2", "ring-blue-500")
      })
    }
    if (this.hasPinterestImageGridTarget) {
      this.pinterestImageGridTarget.querySelectorAll(".external-image-item").forEach(el => {
        el.classList.remove("ring-2", "ring-blue-500")
      })
    }

    // Select new
    item.classList.add("ring-2", "ring-blue-500")
    this.selectedImage = { url, thumbnail, title, source, type: "external" }

    // Show options
    this.imageOptionsTarget.classList.remove("hidden")
    this.selectedImageNameTarget.textContent = title
    this.insertImageBtnTarget.disabled = false

    // Hide local S3 option, show external S3 option
    if (this.hasS3OptionTarget) {
      this.s3OptionTarget.classList.add("hidden")
    }
    if (this.s3Enabled && this.hasS3ExternalOptionTarget) {
      this.s3ExternalOptionTarget.classList.remove("hidden")
    }

    // Pre-fill alt text with title
    const altText = title.replace(/[-_]/g, " ").substring(0, 100)
    this.imageAltTarget.value = altText
  }

  switchImageTab(event) {
    const tab = event.currentTarget.dataset.tab
    this.currentImageTab = tab

    const activeClasses = "border-blue-500 text-blue-600 dark:text-blue-400"
    const inactiveClasses = "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"

    // Update tab button styles
    if (this.hasImageTabLocalTarget && !this.imageTabLocalTarget.classList.contains("hidden")) {
      this.imageTabLocalTarget.className = `px-4 py-2 text-sm font-medium border-b-2 ${tab === "local" ? activeClasses : inactiveClasses}`
    }
    if (this.hasImageTabWebTarget && !this.imageTabWebTarget.classList.contains("hidden")) {
      this.imageTabWebTarget.className = `px-4 py-2 text-sm font-medium border-b-2 ${tab === "web" ? activeClasses : inactiveClasses}`
    }
    if (this.hasImageTabGoogleTarget && !this.imageTabGoogleTarget.classList.contains("hidden")) {
      this.imageTabGoogleTarget.className = `px-4 py-2 text-sm font-medium border-b-2 ${tab === "google" ? activeClasses : inactiveClasses}`
    }
    if (this.hasImageTabPinterestTarget) {
      this.imageTabPinterestTarget.className = `px-4 py-2 text-sm font-medium border-b-2 ${tab === "pinterest" ? activeClasses : inactiveClasses}`
    }

    // Show/hide panels
    if (this.hasImageLocalPanelTarget) {
      this.imageLocalPanelTarget.classList.toggle("hidden", tab !== "local")
    }
    if (this.hasImageWebPanelTarget) {
      this.imageWebPanelTarget.classList.toggle("hidden", tab !== "web")
    }
    if (this.hasImageGooglePanelTarget) {
      this.imageGooglePanelTarget.classList.toggle("hidden", tab !== "google")
    }
    if (this.hasImagePinterestPanelTarget) {
      this.imagePinterestPanelTarget.classList.toggle("hidden", tab !== "pinterest")
    }

    // Focus appropriate input
    if (tab === "local" && this.hasImageSearchTarget) {
      this.imageSearchTarget.focus()
    } else if (tab === "web" && this.hasWebImageSearchTarget) {
      this.webImageSearchTarget.focus()
    } else if (tab === "google" && this.hasGoogleImageSearchTarget) {
      this.googleImageSearchTarget.focus()
    } else if (tab === "pinterest" && this.hasPinterestImageSearchTarget) {
      this.pinterestImageSearchTarget.focus()
    }
  }

  // Web Search (DuckDuckGo/Bing)
  onWebImageSearchKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.searchWebImages()
    }
  }

  async searchWebImages() {
    const query = this.webImageSearchTarget.value.trim()

    if (!query) {
      this.webImageStatusTarget.textContent = "Please enter search keywords"
      return
    }

    this.webImageStatusTarget.textContent = "Searching..."
    if (this.hasWebSearchBtnTarget) this.webSearchBtnTarget.disabled = true
    this.webImageGridTarget.innerHTML = ""

    try {
      const response = await fetch(`/images/search_web?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data.error) {
        this.webImageStatusTarget.innerHTML = `<span class="text-red-500">${data.error}</span>`
        this.webImageResults = []
      } else {
        this.webImageResults = data.images || []

        if (this.webImageResults.length === 0) {
          this.webImageStatusTarget.textContent = data.note || "No images found"
        } else {
          this.webImageStatusTarget.textContent = `Found ${this.webImageResults.length} images - click to select`
        }

        this.renderExternalImageGrid(this.webImageResults, this.webImageGridTarget)
      }
    } catch (error) {
      console.error("Web search error:", error)
      this.webImageStatusTarget.innerHTML = '<span class="text-red-500">Search failed. Please try again.</span>'
      this.webImageResults = []
    } finally {
      if (this.hasWebSearchBtnTarget) this.webSearchBtnTarget.disabled = false
    }
  }

  // Google Images (Custom Search API)
  onGoogleImageSearchKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.searchGoogleImages()
    }
  }

  async searchGoogleImages() {
    const query = this.googleImageSearchTarget.value.trim()

    if (!query) {
      this.googleImageStatusTarget.textContent = "Please enter search keywords"
      return
    }

    // Reset for new search
    this.googleImageResults = []
    this.googleImageNextStart = 1
    this.googleImageQuery = query
    this.googleImageGridTarget.innerHTML = ""

    await this.loadMoreGoogleImages()
  }

  async loadMoreGoogleImages() {
    if (this.googleImageLoading) return

    this.googleImageLoading = true
    this.googleImageStatusTarget.textContent = "Searching..."
    if (this.hasGoogleSearchBtnTarget) this.googleSearchBtnTarget.disabled = true

    try {
      const response = await fetch(`/images/search_google?q=${encodeURIComponent(this.googleImageQuery)}&start=${this.googleImageNextStart}`)
      const data = await response.json()

      if (data.error) {
        this.googleImageStatusTarget.innerHTML = `<span class="text-red-500">${data.error}</span>`
      } else {
        this.googleImageResults = [...this.googleImageResults, ...data.images]
        this.googleImageNextStart = data.next_start

        if (this.googleImageResults.length === 0) {
          this.googleImageStatusTarget.textContent = "No images found"
        } else {
          this.googleImageStatusTarget.textContent = `Found ${data.total || this.googleImageResults.length} images - click to select`
        }

        this.renderExternalImageGrid(this.googleImageResults, this.googleImageGridTarget)
      }
    } catch (error) {
      console.error("Google search error:", error)
      this.googleImageStatusTarget.innerHTML = '<span class="text-red-500">Search failed. Please try again.</span>'
    } finally {
      this.googleImageLoading = false
      if (this.hasGoogleSearchBtnTarget) this.googleSearchBtnTarget.disabled = false
    }
  }

  onGoogleImageScroll(event) {
    const container = event.target
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight

    // Load more when near bottom
    if (scrollBottom < 100 && !this.googleImageLoading && this.googleImageResults.length > 0) {
      this.loadMoreGoogleImages()
    }
  }

  onPinterestImageSearchKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault()
      this.searchPinterestImages()
    }
  }

  async searchPinterestImages() {
    const query = this.pinterestImageSearchTarget.value.trim()

    if (!query) {
      this.pinterestImageStatusTarget.textContent = "Please enter search keywords"
      return
    }

    this.pinterestImageStatusTarget.textContent = "Searching..."
    if (this.hasPinterestSearchBtnTarget) this.pinterestSearchBtnTarget.disabled = true
    this.pinterestImageGridTarget.innerHTML = ""

    try {
      const response = await fetch(`/images/search_pinterest?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data.error) {
        this.pinterestImageStatusTarget.innerHTML = `<span class="text-red-500">${data.error}</span>`
        this.pinterestImageResults = []
      } else {
        this.pinterestImageResults = data.images || []

        if (this.pinterestImageResults.length === 0) {
          this.pinterestImageStatusTarget.textContent = "No images found"
        } else {
          this.pinterestImageStatusTarget.textContent = `Found ${this.pinterestImageResults.length} images - click to select`
        }

        this.renderExternalImageGrid(this.pinterestImageResults, this.pinterestImageGridTarget)
      }
    } catch (error) {
      console.error("Pinterest search error:", error)
      this.pinterestImageStatusTarget.innerHTML = '<span class="text-red-500">Search failed. Please try again.</span>'
      this.pinterestImageResults = []
    } finally {
      if (this.hasPinterestSearchBtnTarget) this.pinterestSearchBtnTarget.disabled = false
    }
  }

  renderExternalImageGrid(images, container) {
    if (!images || images.length === 0) {
      container.innerHTML = '<div class="col-span-4 text-center text-zinc-500 py-8">No images found</div>'
      return
    }

    container.innerHTML = images.map((image, index) => {
      const dimensions = (image.width && image.height) ? `${image.width}x${image.height}` : ""
      return `
        <button
          type="button"
          data-index="${index}"
          data-url="${this.escapeHtml(image.url)}"
          data-thumbnail="${this.escapeHtml(image.thumbnail || image.url)}"
          data-title="${this.escapeHtml(image.title || '')}"
          data-source="${this.escapeHtml(image.source || '')}"
          data-action="click->app#selectExternalImage"
          class="external-image-item relative aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-blue-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="${this.escapeHtml(image.title || 'Image')}${dimensions ? ` (${dimensions})` : ''}"
        >
          <img
            src="${this.escapeHtml(image.thumbnail || image.url)}"
            alt="${this.escapeHtml(image.title || 'Image')}"
            class="w-full h-full object-cover"
            loading="lazy"
            onerror="this.parentElement.remove()"
          >
          ${dimensions ? `<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded font-mono">${dimensions}</div>` : ''}
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
            <div class="text-white text-xs truncate">${this.escapeHtml(image.source || '')}</div>
          </div>
        </button>
      `
    }).join("")
  }

  async insertImage() {
    if (!this.selectedImage || !this.hasTextareaTarget) return

    let imageUrl

    if (this.selectedImage.type === "local") {
      // Local image
      const uploadToS3 = this.s3Enabled && this.hasUploadToS3Target && this.uploadToS3Target.checked
      const resizeRatio = uploadToS3 && this.hasResizeSelectLocalTarget ? this.resizeSelectLocalTarget.value : ""
      imageUrl = `/images/preview/${this.encodePath(this.selectedImage.path)}`

      if (uploadToS3) {
        // Show loading state
        this.showImageLoading(resizeRatio ? "Resizing and uploading to S3..." : "Uploading to S3...")
        this.insertImageBtnTarget.disabled = true

        try {
          const response = await fetch("/images/upload_to_s3", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": this.csrfToken
            },
            body: JSON.stringify({ path: this.selectedImage.path, resize: resizeRatio })
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || "Failed to upload to S3")
          }

          const data = await response.json()
          imageUrl = data.url
        } catch (error) {
          console.error("Error uploading to S3:", error)
          alert(`Failed to upload to S3: ${error.message}`)
          this.hideImageLoading()
          this.insertImageBtnTarget.disabled = false
          return
        }

        this.hideImageLoading()
      }
    } else {
      // External image (Google/Pinterest)
      const reuploadToS3 = this.s3Enabled && this.hasReuploadToS3Target && this.reuploadToS3Target.checked
      const resizeRatio = reuploadToS3 && this.hasResizeSelectExternalTarget ? this.resizeSelectExternalTarget.value : ""
      imageUrl = this.selectedImage.url

      if (reuploadToS3) {
        // Show loading state
        this.showImageLoading(resizeRatio ? "Downloading, resizing and uploading to S3..." : "Downloading and uploading to S3...")
        this.insertImageBtnTarget.disabled = true

        try {
          const response = await fetch("/images/upload_external_to_s3", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": this.csrfToken
            },
            body: JSON.stringify({ url: this.selectedImage.url, resize: resizeRatio })
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || "Failed to upload to S3")
          }

          const data = await response.json()
          imageUrl = data.url
        } catch (error) {
          console.error("Error uploading external image to S3:", error)
          alert(`Failed to upload to S3: ${error.message}`)
          this.hideImageLoading()
          this.insertImageBtnTarget.disabled = false
          return
        }

        this.hideImageLoading()
      }
    }

    // Build markdown
    const altText = this.imageAltTarget.value.trim() || this.selectedImage.name || this.selectedImage.title || "Image"
    const linkUrl = this.imageLinkTarget.value.trim()

    let markdown = `![${altText}](${imageUrl})`

    if (linkUrl) {
      markdown = `[![${altText}](${imageUrl})](${linkUrl})`
    }

    // Insert at cursor
    const textarea = this.textareaTarget
    const cursorPos = textarea.selectionStart
    const text = textarea.value
    const before = text.substring(0, cursorPos)
    const after = text.substring(cursorPos)

    // Add newlines if needed
    const prefix = before.length > 0 && !before.endsWith("\n") ? "\n\n" : ""
    const suffix = after.length > 0 && !after.startsWith("\n") ? "\n\n" : ""

    textarea.value = before + prefix + markdown + suffix + after

    const newPos = before.length + prefix.length + markdown.length
    textarea.setSelectionRange(newPos, newPos)
    textarea.focus()

    this.scheduleAutoSave()
    this.updatePreview()
    this.closeImageDialog()
  }

  onS3CheckboxChange(event) {
    if (this.hasResizeOptionLocalTarget) {
      this.resizeOptionLocalTarget.classList.toggle("hidden", !event.target.checked)
      if (!event.target.checked && this.hasResizeSelectLocalTarget) {
        this.resizeSelectLocalTarget.value = "0.5"  // Reset to default
      }
    }
  }

  onS3ExternalCheckboxChange(event) {
    if (this.hasResizeOptionExternalTarget) {
      this.resizeOptionExternalTarget.classList.toggle("hidden", !event.target.checked)
      if (!event.target.checked && this.hasResizeSelectExternalTarget) {
        this.resizeSelectExternalTarget.value = "0.5"  // Reset to default
      }
    }
  }

  showImageLoading(message) {
    if (this.hasImageLoadingTarget) {
      this.imageLoadingTarget.classList.remove("hidden")
      this.imageLoadingTarget.classList.add("flex")
    }
    if (this.hasImageLoadingTextTarget) {
      this.imageLoadingTextTarget.textContent = message
    }
  }

  hideImageLoading() {
    if (this.hasImageLoadingTarget) {
      this.imageLoadingTarget.classList.add("hidden")
      this.imageLoadingTarget.classList.remove("flex")
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

    // Save to localStorage
    localStorage.setItem("editorFont", this.currentFont)
    localStorage.setItem("editorFontSize", this.currentFontSize.toString())

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

  // Preview Zoom
  zoomPreviewIn() {
    const currentIndex = this.previewZoomLevels.indexOf(this.previewZoom)
    if (currentIndex < this.previewZoomLevels.length - 1) {
      this.previewZoom = this.previewZoomLevels[currentIndex + 1]
      this.applyPreviewZoom()
      localStorage.setItem("previewZoom", this.previewZoom.toString())
    }
  }

  zoomPreviewOut() {
    const currentIndex = this.previewZoomLevels.indexOf(this.previewZoom)
    if (currentIndex > 0) {
      this.previewZoom = this.previewZoomLevels[currentIndex - 1]
      this.applyPreviewZoom()
      localStorage.setItem("previewZoom", this.previewZoom.toString())
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
    localStorage.setItem("sidebarVisible", this.sidebarVisible.toString())
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

  // Typewriter Mode - keeps cursor at a fixed position on screen
  toggleTypewriterMode() {
    this.typewriterModeEnabled = !this.typewriterModeEnabled
    localStorage.setItem("typewriterMode", this.typewriterModeEnabled.toString())
    this.applyTypewriterMode()

    // Immediately apply typewriter scroll if enabling
    if (this.typewriterModeEnabled) {
      this.maintainTypewriterScroll()
    }
  }

  applyTypewriterMode() {
    if (this.hasTextareaTarget) {
      this.textareaTarget.classList.toggle("typewriter-mode", this.typewriterModeEnabled)
    }
    // Update toggle button state if exists
    const typewriterBtn = this.element.querySelector("[data-typewriter-mode-btn]")
    if (typewriterBtn) {
      typewriterBtn.classList.toggle("bg-[var(--theme-bg-hover)]", this.typewriterModeEnabled)
      typewriterBtn.setAttribute("aria-pressed", this.typewriterModeEnabled.toString())
    }
  }

  // Keep cursor at ~35% from top of the editor in typewriter mode
  maintainTypewriterScroll() {
    if (!this.typewriterModeEnabled) return
    if (!this.hasTextareaTarget) return

    const textarea = this.textareaTarget
    const text = textarea.value
    const cursorPos = textarea.selectionStart

    // Calculate which line the cursor is on
    const textBeforeCursor = text.substring(0, cursorPos)
    const linesBefore = textBeforeCursor.split("\n").length

    // Get line height from computed style
    const style = window.getComputedStyle(textarea)
    const fontSize = parseFloat(style.fontSize) || 14
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.6

    // Calculate cursor's vertical position (in pixels from top of content)
    const cursorY = (linesBefore - 1) * lineHeight

    // Target position: 35% from top of visible area (upper-middle)
    const targetY = textarea.clientHeight * 0.35

    // Calculate desired scroll position to put cursor at target
    const desiredScrollTop = cursorY - targetY

    // Apply scroll (with a small threshold to avoid constant micro-adjustments)
    const scrollDiff = Math.abs(textarea.scrollTop - desiredScrollTop)
    if (scrollDiff > lineHeight * 0.5) {
      textarea.scrollTop = Math.max(0, desiredScrollTop)
    }

    // Also sync preview if visible
    if (!this.previewPanelTarget.classList.contains("hidden")) {
      this.syncPreviewToTypewriter(linesBefore, text.split("\n").length)
    }
  }

  // Sync preview scroll in typewriter mode
  syncPreviewToTypewriter(currentLine, totalLines) {
    if (!this.hasPreviewContentTarget) return
    if (totalLines <= 1) return

    const preview = this.previewContentTarget
    const lineRatio = (currentLine - 1) / (totalLines - 1)

    // Target: same 35% from top position (upper-middle)
    const targetY = preview.clientHeight * 0.35
    const contentHeight = preview.scrollHeight - preview.clientHeight

    if (contentHeight > 0) {
      const desiredScroll = (lineRatio * preview.scrollHeight) - targetY
      preview.scrollTop = Math.max(0, Math.min(contentHeight, desiredScroll))
    }
  }

  // File Finder (Ctrl+P)
  openFileFinder() {
    // Build flat list of all files from tree
    this.allFiles = this.flattenTree(this.treeValue)
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

  flattenTree(items, result = []) {
    if (!items) return result
    for (const item of items) {
      if (item.type === "file") {
        result.push(item)
      } else if (item.type === "folder" && item.children) {
        this.flattenTree(item.children, result)
      }
    }
    return result
  }

  onFileFinderInput() {
    const query = this.fileFinderInputTarget.value.trim().toLowerCase()

    if (!query) {
      this.fileFinderResults = [...this.allFiles].slice(0, 10)
    } else {
      // Fuzzy search: files that contain all characters in order
      this.fileFinderResults = this.allFiles
        .map(file => {
          const score = this.fuzzyScore(file.name.toLowerCase(), query)
          return { ...file, score }
        })
        .filter(file => file.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
    }

    this.selectedFileIndex = 0
    this.renderFileFinderResults()
  }

  fuzzyScore(str, query) {
    let score = 0
    let strIndex = 0
    let prevMatchIndex = -1
    let consecutiveBonus = 0

    for (let i = 0; i < query.length; i++) {
      const char = query[i]
      const foundIndex = str.indexOf(char, strIndex)

      if (foundIndex === -1) {
        return 0 // Character not found, no match
      }

      // Base score for finding the character
      score += 1

      // Bonus for consecutive matches
      if (foundIndex === prevMatchIndex + 1) {
        consecutiveBonus += 2
        score += consecutiveBonus
      } else {
        consecutiveBonus = 0
      }

      // Bonus for matching at start or after separator
      if (foundIndex === 0 || str[foundIndex - 1] === '/' || str[foundIndex - 1] === '-' || str[foundIndex - 1] === '_') {
        score += 3
      }

      prevMatchIndex = foundIndex
      strIndex = foundIndex + 1
    }

    // Bonus for shorter names (more precise match)
    score += Math.max(0, 10 - (str.length - query.length))

    return score
  }

  renderFileFinderResults() {
    if (this.fileFinderResults.length === 0) {
      this.fileFinderResultsTarget.innerHTML = `
        <div class="px-3 py-6 text-center text-[var(--theme-text-muted)] text-sm">
          No files found
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
            data-path="${this.escapeHtml(file.path)}"
            data-action="click->app#selectFileFromFinder mouseenter->app#hoverFileFinderResult"
          >
            <svg class="w-4 h-4 flex-shrink-0 ${isSelected ? '' : 'text-[var(--theme-text-muted)]'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium">${this.escapeHtml(name)}</div>
              ${displayPath ? `<div class="truncate text-xs ${isSelected ? 'opacity-75' : 'text-[var(--theme-text-muted)]'}">${this.escapeHtml(displayPath)}</div>` : ''}
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
      const response = await fetch(`/notes/${this.encodePath(file.path)}`, {
        headers: { "Accept": "application/json" }
      })

      if (!response.ok) {
        this.fileFinderPreviewTarget.innerHTML = `<div class="text-[var(--theme-text-muted)] text-sm">Unable to load preview</div>`
        return
      }

      const data = await response.json()
      const lines = (data.content || "").split("\n").slice(0, 10)
      const preview = lines.join("\n")

      this.fileFinderPreviewTarget.innerHTML = `<pre class="text-xs font-mono whitespace-pre-wrap text-[var(--theme-text-secondary)] leading-relaxed">${this.escapeHtml(preview)}${lines.length >= 10 ? '\n...' : ''}</pre>`
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
      localStorage.setItem("sidebarVisible", "true")
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
    this.contentSearchStatusTarget.textContent = "Type to search in file contents (supports regex)"
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
      this.contentSearchStatusTarget.textContent = "Type to search in file contents (supports regex)"
      return
    }

    this.contentSearchStatusTarget.textContent = "Searching..."

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
        throw new Error("Search failed")
      }

      this.searchResultsData = await response.json()
      this.selectedSearchIndex = 0
      this.renderContentSearchResults()

      const count = this.searchResultsData.length
      const maxMsg = count >= 20 ? " (showing first 20)" : ""
      this.contentSearchStatusTarget.textContent = count === 0
        ? "No matches found"
        : `${count} match${count === 1 ? "" : "es"} found${maxMsg} - use ↑↓ to navigate, Enter to open`
    } catch (error) {
      console.error("Search error:", error)
      this.contentSearchStatusTarget.textContent = "Search error"
      this.contentSearchResultsTarget.innerHTML = ""
    }
  }

  renderContentSearchResults() {
    if (this.searchResultsData.length === 0) {
      this.contentSearchResultsTarget.innerHTML = `
        <div class="px-4 py-8 text-center text-[var(--theme-text-muted)] text-sm">
          No matches found
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
          const escapedContent = this.escapeHtml(line.content)
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
            data-path="${this.escapeHtml(result.path)}"
            data-line="${result.line_number}"
            data-action="click->app#selectContentSearchResult mouseenter->app#hoverContentSearchResult"
          >
            <div class="px-3 py-2">
              <div class="flex items-center gap-2 mb-1">
                <svg class="w-4 h-4 flex-shrink-0 ${isSelected ? '' : 'text-[var(--theme-text-muted)]'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span class="font-medium truncate">${this.escapeHtml(result.name)}</span>
                <span class="text-xs ${isSelected ? 'opacity-80' : 'text-[var(--theme-text-muted)]'}">:${result.line_number}</span>
                <span class="text-xs ${isSelected ? 'opacity-70' : 'text-[var(--theme-text-faint)]'} truncate ml-auto">${this.escapeHtml(result.path.replace(/\.md$/, ""))}</span>
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
      localStorage.setItem("sidebarVisible", "true")
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
      const codeBlock = this.findCodeBlockAtPosition(text, cursorPos)

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

  findCodeBlockAtPosition(text, pos) {
    // Find fenced code blocks using regex
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
    let match

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const startPos = match.index
      const endPos = match.index + match[0].length

      if (pos >= startPos && pos <= endPos) {
        return {
          startPos,
          endPos,
          language: match[1],
          content: match[2]
        }
      }
    }

    return null
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
        class="w-full px-3 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 focus:bg-zinc-100 dark:focus:bg-zinc-700 focus:outline-none"
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
        this.levenshteinDistance(lang, language.toLowerCase()) <= 2
      )
      if (!isClose) {
        const proceed = confirm(`"${language}" is not a recognized language. Insert anyway?`)
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
  levenshteinDistance(a, b) {
    const matrix = []
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    return matrix[b.length][a.length]
  }

  // Video Dialog
  openVideoDialog() {
    // Reset URL tab
    this.videoUrlTarget.value = ""
    this.videoPreviewTarget.innerHTML = '<span class="text-zinc-500 dark:text-zinc-400">Enter a URL to see preview</span>'
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
      if (this.youtubeApiEnabled) {
        this.youtubeSearchStatusTarget.textContent = "Enter keywords and click Search or press Enter"
      } else {
        this.youtubeSearchStatusTarget.innerHTML = '<span class="text-amber-500">YouTube API not configured. Set YOUTUBE_API_KEY env variable.</span>'
      }
    }
    this.youtubeSearchResults = []
    this.selectedYoutubeIndex = -1

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

  switchVideoTab(event) {
    const tab = event.currentTarget.dataset.tab

    // Update tab buttons
    const urlTabClasses = tab === "url"
      ? "border-blue-500 text-blue-600 dark:text-blue-400"
      : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
    const searchTabClasses = tab === "search"
      ? "border-blue-500 text-blue-600 dark:text-blue-400"
      : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"

    this.videoTabUrlTarget.className = `px-4 py-2 text-sm font-medium border-b-2 ${urlTabClasses}`
    this.videoTabSearchTarget.className = `px-4 py-2 text-sm font-medium border-b-2 ${searchTabClasses}`

    // Show/hide panels
    this.videoUrlPanelTarget.classList.toggle("hidden", tab !== "url")
    this.videoSearchPanelTarget.classList.toggle("hidden", tab !== "search")

    // Focus appropriate input
    if (tab === "url") {
      this.videoUrlTarget.focus()
    } else if (tab === "search" && this.hasYoutubeSearchInputTarget) {
      this.youtubeSearchInputTarget.focus()
    }
  }

  closeVideoDialog() {
    this.videoDialogTarget.close()
  }

  onVideoUrlInput() {
    const url = this.videoUrlTarget.value.trim()

    if (!url) {
      this.videoPreviewTarget.innerHTML = '<span class="text-zinc-500 dark:text-zinc-400">Enter a URL to see preview</span>'
      this.insertVideoBtnTarget.disabled = true
      this.detectedVideoType = null
      return
    }

    // Check for YouTube
    const youtubeId = this.extractYouTubeId(url)
    if (youtubeId) {
      this.detectedVideoType = "youtube"
      this.detectedVideoData = { id: youtubeId }
      const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
      this.videoPreviewTarget.innerHTML = `
        <div class="flex gap-3">
          <div class="relative flex-shrink-0 w-32 h-18 rounded overflow-hidden bg-zinc-200 dark:bg-zinc-700">
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
            <div class="font-medium text-zinc-900 dark:text-zinc-100">YouTube Video</div>
            <div class="text-xs text-zinc-500 dark:text-zinc-400">ID: ${youtubeId}</div>
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
          <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div class="font-medium text-zinc-900 dark:text-zinc-100">Video File</div>
            <div class="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[350px]">${this.escapeHtml(filename)}</div>
          </div>
        </div>
      `
      this.insertVideoBtnTarget.disabled = false
      return
    }

    // Unknown format
    this.detectedVideoType = null
    this.detectedVideoData = null
    this.videoPreviewTarget.innerHTML = '<span class="text-amber-500">Unknown format. Enter a YouTube URL or video file path.</span>'
    this.insertVideoBtnTarget.disabled = true
  }

  onVideoUrlKeydown(event) {
    if (event.key === "Enter" && !this.insertVideoBtnTarget.disabled) {
      event.preventDefault()
      this.insertVideo()
    }
  }

  extractYouTubeId(url) {
    // Match various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/ // Just the ID
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }

    return null
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
  <source src="${this.escapeHtml(url)}" type="${mimeType}">
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
      this.youtubeSearchStatusTarget.textContent = "Please enter search keywords"
      return
    }

    if (!this.youtubeApiEnabled) {
      this.youtubeSearchStatusTarget.innerHTML = '<span class="text-amber-500">YouTube API not configured. Set YOUTUBE_API_KEY env variable.</span>'
      return
    }

    this.youtubeSearchStatusTarget.textContent = "Searching..."
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
          this.youtubeSearchStatusTarget.textContent = "No videos found"
        } else {
          this.youtubeSearchStatusTarget.textContent = `Found ${this.youtubeSearchResults.length} videos - click to insert or use arrow keys`
        }
        this.selectedYoutubeIndex = -1
        this.renderYoutubeResults()
      }
    } catch (error) {
      console.error("YouTube search error:", error)
      this.youtubeSearchStatusTarget.innerHTML = '<span class="text-red-500">Search failed. Please try again.</span>'
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
      const selectedClass = isSelected ? "ring-2 ring-blue-500" : ""

      return `
        <button
          type="button"
          data-index="${index}"
          data-video-id="${video.id}"
          data-video-title="${this.escapeHtml(video.title)}"
          data-action="click->app#selectYoutubeVideo keydown->app#onYoutubeResultKeydown"
          class="flex flex-col rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors ${selectedClass} focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div class="relative aspect-video bg-zinc-200 dark:bg-zinc-700">
            <img
              src="${video.thumbnail}"
              alt="${this.escapeHtml(video.title)}"
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
            <div class="text-xs font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">${this.escapeHtml(video.title)}</div>
            <div class="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">${this.escapeHtml(video.channel)}</div>
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
    this.newItemTitleTarget.textContent = "New Note"
    this.newItemInputTarget.value = ""
    this.newItemInputTarget.placeholder = "Note name"
    this.showNewItemDialogAtPosition()
    this.newItemInputTarget.focus()
  }

  selectNoteTypeHugo() {
    this.noteTypeDialogTarget.close()
    this.newItemType = "hugo"
    this.newItemTitleTarget.textContent = "New Hugo Blog Post"
    this.newItemInputTarget.value = ""
    this.newItemInputTarget.placeholder = "Post title"
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
    this.newItemTitleTarget.textContent = "New Folder"
    this.newItemInputTarget.value = ""
    this.newItemInputTarget.placeholder = "Folder name"
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
        const { notePath, content } = this.generateHugoBlogPost(name)

        const response = await fetch(`/notes/${this.encodePath(notePath)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": this.csrfToken
          },
          body: JSON.stringify({ content, create_directories: true })
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to create Hugo post")
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
        const response = await fetch(`/notes/${this.encodePath(notePath)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": this.csrfToken
          },
          body: JSON.stringify({ content: `# ${name}\n\n` })
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to create note")
        }

        await this.refreshTree()
        await this.loadFile(notePath)
      } else {
        // Folder
        const response = await fetch(`/folders/${this.encodePath(basePath)}`, {
          method: "POST",
          headers: {
            "X-CSRF-Token": this.csrfToken
          }
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to create folder")
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

  // Generate Hugo blog post path and content
  generateHugoBlogPost(title) {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")

    // Generate slug from title
    const slug = this.slugify(title)

    // Build path: YYYY/MM/DD/slug/index.md
    const dirPath = `${year}/${month}/${day}/${slug}`
    const notePath = `${dirPath}/index.md`

    // Generate ISO date with timezone offset
    const tzOffset = -now.getTimezoneOffset()
    const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, "0")
    const tzMins = String(Math.abs(tzOffset) % 60).padStart(2, "0")
    const tzSign = tzOffset >= 0 ? "+" : "-"
    const isoDate = `${year}-${month}-${day}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}${tzSign}${tzHours}${tzMins}`

    // Generate Hugo frontmatter
    const content = `---
title: "${title.replace(/"/g, '\\"')}"
slug: "${slug}"
date: ${isoDate}
draft: true
tags:
-
---

`

    return { notePath, content }
  }

  // Slugify text for URLs - handles accented characters
  slugify(text) {
    // Map of accented characters to their ASCII equivalents
    const accentMap = {
      "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "æ": "ae",
      "ç": "c", "č": "c", "ć": "c",
      "è": "e", "é": "e", "ê": "e", "ë": "e", "ě": "e",
      "ì": "i", "í": "i", "î": "i", "ï": "i",
      "ð": "d", "ď": "d",
      "ñ": "n", "ň": "n",
      "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ö": "o", "ø": "o",
      "ù": "u", "ú": "u", "û": "u", "ü": "u", "ů": "u",
      "ý": "y", "ÿ": "y",
      "ž": "z", "ź": "z", "ż": "z",
      "ß": "ss", "þ": "th",
      "š": "s", "ś": "s",
      "ř": "r",
      "ł": "l",
      "À": "A", "Á": "A", "Â": "A", "Ã": "A", "Ä": "A", "Å": "A", "Æ": "AE",
      "Ç": "C", "Č": "C", "Ć": "C",
      "È": "E", "É": "E", "Ê": "E", "Ë": "E", "Ě": "E",
      "Ì": "I", "Í": "I", "Î": "I", "Ï": "I",
      "Ð": "D", "Ď": "D",
      "Ñ": "N", "Ň": "N",
      "Ò": "O", "Ó": "O", "Ô": "O", "Õ": "O", "Ö": "O", "Ø": "O",
      "Ù": "U", "Ú": "U", "Û": "U", "Ü": "U", "Ů": "U",
      "Ý": "Y",
      "Ž": "Z", "Ź": "Z", "Ż": "Z",
      "Š": "S", "Ś": "S",
      "Ř": "R",
      "Ł": "L"
    }

    return text
      .toLowerCase()
      // Replace accented characters
      .split("")
      .map(char => accentMap[char] || char)
      .join("")
      // Replace any non-alphanumeric characters with hyphens
      .replace(/[^a-z0-9]+/g, "-")
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, "")
      // Collapse multiple hyphens
      .replace(/-+/g, "-")
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
    document.addEventListener("click", () => {
      this.contextMenuTarget.classList.add("hidden")
    })
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
      const response = await fetch(`/${endpoint}/${this.encodePath(oldPath)}/rename`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfToken
        },
        body: JSON.stringify({ new_path: newPath })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to rename")
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
      ? `Delete "${this.contextItem.path.replace(/\.md$/, "")}"?`
      : `Delete folder "${this.contextItem.path}"? (must be empty)`

    if (!confirm(confirmMsg)) return

    try {
      const endpoint = this.contextItem.type === "file" ? "notes" : "folders"
      const response = await fetch(`/${endpoint}/${this.encodePath(this.contextItem.path)}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": this.csrfToken
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete")
      }

      if (this.currentFile === this.contextItem.path) {
        this.currentFile = null
        this.currentPathTarget.textContent = "Select or create a note"
        this.editorPlaceholderTarget.classList.remove("hidden")
        this.editorTarget.classList.add("hidden")
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
    document.addEventListener("keydown", (event) => {
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
    })
  }

  // Utilities
  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  // Encode path for URL (encode each segment, preserve slashes)
  encodePath(path) {
    return path.split("/").map(segment => encodeURIComponent(segment)).join("/")
  }

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
}
