import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["lightIcon", "darkIcon"]

  connect() {
    this.applyTheme()
  }

  toggle() {
    const isDark = document.documentElement.classList.contains("dark")
    localStorage.setItem("theme", isDark ? "light" : "dark")
    this.applyTheme()
  }

  applyTheme() {
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark)

    document.documentElement.classList.toggle("dark", shouldBeDark)
  }
}
