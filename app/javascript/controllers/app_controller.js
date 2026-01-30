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
    "insertImageBtn"
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
    this.selectedImage = null
    this.imageSearchTimeout = null

    this.renderTree()
    this.setupKeyboardShortcuts()
    this.setupContextMenuClose()
    this.setupDialogClickOutside()
    this.loadImagesConfig()

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

    if (isHidden) {
      this.updatePreview()
    }
  }

  updatePreview() {
    if (this.previewPanelTarget.classList.contains("hidden")) return
    if (!this.hasTextareaTarget) return

    const content = this.textareaTarget.value
    this.previewContentTarget.innerHTML = marked.parse(content)
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

        // Show/hide image button based on config
        if (this.imagesEnabled && this.hasImageBtnTarget) {
          this.imageBtnTarget.classList.remove("hidden")
        }
      }
    } catch (error) {
      console.error("Error loading images config:", error)
    }
  }

  async openImagePicker() {
    if (!this.imagesEnabled) return

    this.selectedImage = null
    this.imageSearchTarget.value = ""
    this.imageAltTarget.value = ""
    this.imageLinkTarget.value = ""
    this.imageOptionsTarget.classList.add("hidden")
    this.insertImageBtnTarget.disabled = true

    // Show/hide S3 option
    if (this.s3Enabled) {
      this.s3OptionTarget.classList.remove("hidden")
      this.uploadToS3Target.checked = false
    } else {
      this.s3OptionTarget.classList.add("hidden")
    }

    await this.loadImages()
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

    const html = images.map(image => `
      <div
        class="image-grid-item ${this.selectedImage?.path === image.path ? 'selected' : ''}"
        data-action="click->app#selectImage"
        data-path="${this.escapeHtml(image.path)}"
        data-name="${this.escapeHtml(image.name)}"
        title="${this.escapeHtml(image.name)}"
      >
        <img src="/images/preview/${this.encodePath(image.path)}" alt="${this.escapeHtml(image.name)}" loading="lazy">
      </div>
    `).join("")

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

    // Deselect previous
    this.imageGridTarget.querySelectorAll(".image-grid-item").forEach(el => {
      el.classList.remove("selected")
    })

    // Select new
    item.classList.add("selected")
    this.selectedImage = { path, name }

    // Show options
    this.imageOptionsTarget.classList.remove("hidden")
    this.selectedImageNameTarget.textContent = name
    this.insertImageBtnTarget.disabled = false

    // Pre-fill alt text with filename (without extension)
    const altText = name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ")
    this.imageAltTarget.value = altText
  }

  async insertImage() {
    if (!this.selectedImage || !this.hasTextareaTarget) return

    const uploadToS3 = this.s3Enabled && this.uploadToS3Target.checked
    let imageUrl = `/images/preview/${this.encodePath(this.selectedImage.path)}`

    if (uploadToS3) {
      // Show loading state
      this.imageLoadingTarget.classList.remove("hidden")
      this.imageLoadingTarget.classList.add("flex")
      this.insertImageBtnTarget.disabled = true

      try {
        const response = await fetch("/images/upload_to_s3", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": this.csrfToken
          },
          body: JSON.stringify({ path: this.selectedImage.path })
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
        this.imageLoadingTarget.classList.add("hidden")
        this.imageLoadingTarget.classList.remove("flex")
        this.insertImageBtnTarget.disabled = false
        return
      }

      this.imageLoadingTarget.classList.add("hidden")
      this.imageLoadingTarget.classList.remove("flex")
    }

    // Build markdown
    const altText = this.imageAltTarget.value.trim() || this.selectedImage.name
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

  // Help Dialog
  openHelp() {
    this.showDialogCentered(this.helpDialogTarget)
  }

  closeHelp() {
    this.helpDialogTarget.close()
  }

  // New Note/Folder
  newNote() {
    this.newItemType = "note"
    this.newItemParent = ""
    this.newItemTitleTarget.textContent = "New Note"
    this.newItemInputTarget.value = ""
    this.newItemInputTarget.placeholder = "Note name"
    this.showDialogCentered(this.newItemDialogTarget)
    this.newItemInputTarget.focus()
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

    const path = this.newItemParent ? `${this.newItemParent}/${name}` : name

    try {
      if (this.newItemType === "note") {
        const notePath = path.endsWith(".md") ? path : `${path}.md`
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
        const response = await fetch(`/folders/${this.encodePath(path)}`, {
          method: "POST",
          headers: {
            "X-CSRF-Token": this.csrfToken
          }
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to create folder")
        }

        this.expandedFolders.add(path)
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

    this.newItemType = "note"
    this.newItemParent = this.contextItem.path
    this.newItemTitleTarget.textContent = "New Note"
    this.newItemInputTarget.value = ""
    this.newItemInputTarget.placeholder = "Note name"
    this.positionDialogNearPoint(this.newItemDialogTarget, this.contextClickX, this.contextClickY)
    this.newItemInputTarget.focus()

    // Expand the folder
    this.expandedFolders.add(this.contextItem.path)
    this.renderTree()
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
      this.helpDialogTarget
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
