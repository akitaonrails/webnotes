import { Controller } from "@hotwired/stimulus"

// Customize Controller
// Handles editor font and size customization dialog
// Dispatches customize:applied event with { font, fontSize }

export default class extends Controller {
  static targets = [
    "dialog",
    "fontSelect",
    "fontSizeSelect",
    "preview"
  ]

  static values = {
    font: { type: String, default: "cascadia-code" },
    fontSize: { type: Number, default: 14 }
  }

  connect() {
    this.fonts = [
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

    this.fontSizes = [12, 13, 14, 15, 16, 18, 20, 22, 24]

    // Setup click-outside-to-close
    if (this.hasDialogTarget) {
      this.dialogTarget.addEventListener("click", (event) => {
        if (event.target === this.dialogTarget) {
          this.close()
        }
      })
    }
  }

  // Open the customization dialog
  open(currentFont = null, currentFontSize = null) {
    if (!this.hasDialogTarget) return

    // Use provided values or fall back to stored values
    const font = currentFont || this.fontValue
    const fontSize = currentFontSize || this.fontSizeValue

    // Set current values in selects
    if (this.hasFontSelectTarget) {
      this.fontSelectTarget.value = font
    }
    if (this.hasFontSizeSelectTarget) {
      this.fontSizeSelectTarget.value = fontSize
    }

    // Update preview
    this.updatePreview()

    // Show dialog centered
    this.dialogTarget.showModal()
  }

  // Close the dialog
  close() {
    if (this.hasDialogTarget) {
      this.dialogTarget.close()
    }
  }

  // Handle font change
  onFontChange() {
    this.updatePreview()
  }

  // Handle font size change
  onFontSizeChange() {
    this.updatePreview()
  }

  // Update preview with current selections
  updatePreview() {
    if (!this.hasPreviewTarget) return

    const fontId = this.hasFontSelectTarget ? this.fontSelectTarget.value : this.fontValue
    const fontSize = this.hasFontSizeSelectTarget ? this.fontSizeSelectTarget.value : String(this.fontSizeValue)
    const font = this.fonts.find(f => f.id === fontId)

    if (font) {
      this.previewTarget.style.fontFamily = font.family
      this.previewTarget.style.fontSize = `${fontSize}px`
    }
  }

  // Apply customization and dispatch event
  apply() {
    const fontId = this.hasFontSelectTarget ? this.fontSelectTarget.value : this.fontValue
    const fontSize = this.hasFontSizeSelectTarget ? parseInt(this.fontSizeSelectTarget.value, 10) : this.fontSizeValue
    const font = this.fonts.find(f => f.id === fontId)

    // Update stored values
    this.fontValue = fontId
    this.fontSizeValue = fontSize

    // Dispatch event with settings
    this.dispatch("applied", {
      detail: {
        font: fontId,
        fontFamily: font ? font.family : null,
        fontSize: fontSize
      }
    })

    this.close()
  }

  // Get font family for a font id
  getFontFamily(fontId) {
    const font = this.fonts.find(f => f.id === fontId)
    return font ? font.family : null
  }
}
