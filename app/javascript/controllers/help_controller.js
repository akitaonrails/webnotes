import { Controller } from "@hotwired/stimulus"

// Help Controller
// Manages help and about dialogs

export default class extends Controller {
  static targets = [
    "helpDialog",
    "aboutDialog"
  ]

  connect() {
    // Setup click-outside-to-close for dialogs
    this.setupDialogClickOutside()
  }

  setupDialogClickOutside() {
    const dialogs = [this.helpDialogTarget, this.aboutDialogTarget].filter(d => d)

    dialogs.forEach(dialog => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
          dialog.close()
        }
      })
    })
  }

  // Open help dialog
  openHelp() {
    if (this.hasHelpDialogTarget) {
      this.helpDialogTarget.showModal()
    }
  }

  // Close help dialog
  closeHelp() {
    if (this.hasHelpDialogTarget) {
      this.helpDialogTarget.close()
    }
  }

  // Open about dialog
  openAbout() {
    if (this.hasAboutDialogTarget) {
      this.aboutDialogTarget.showModal()
    }
  }

  // Close about dialog
  closeAbout() {
    if (this.hasAboutDialogTarget) {
      this.aboutDialogTarget.close()
    }
  }

  // Handle escape key for closing dialogs
  onKeydown(event) {
    if (event.key === "Escape") {
      if (this.hasHelpDialogTarget && this.helpDialogTarget.open) {
        this.helpDialogTarget.close()
      }
      if (this.hasAboutDialogTarget && this.aboutDialogTarget.open) {
        this.aboutDialogTarget.close()
      }
    }
  }
}
