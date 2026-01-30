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
    "newItemInput"
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

    this.renderTree()
    this.setupKeyboardShortcuts()
    this.setupContextMenuClose()

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
    this.textareaTarget.value = content
    this.textareaTarget.focus()
    this.updatePreview()
  }

  onTextareaInput() {
    this.scheduleAutoSave()
    this.updatePreview()
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

  // New Note/Folder
  newNote() {
    this.newItemType = "note"
    this.newItemParent = ""
    this.newItemTitleTarget.textContent = "New Note"
    this.newItemInputTarget.value = ""
    this.newItemInputTarget.placeholder = "Note name"
    this.newItemDialogTarget.showModal()
    this.newItemInputTarget.focus()
  }

  newFolder() {
    this.newItemType = "folder"
    this.newItemParent = ""
    this.newItemTitleTarget.textContent = "New Folder"
    this.newItemInputTarget.value = ""
    this.newItemInputTarget.placeholder = "Folder name"
    this.newItemDialogTarget.showModal()
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
    this.newItemDialogTarget.showModal()
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

  renameItem() {
    if (!this.contextItem) return

    const name = this.contextItem.path.split("/").pop().replace(/\.md$/, "")
    this.renameInputTarget.value = name
    this.renameDialogTarget.showModal()
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

      // Escape: Close dialogs
      if (event.key === "Escape") {
        this.contextMenuTarget.classList.add("hidden")
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
}
