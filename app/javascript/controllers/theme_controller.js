import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu", "currentTheme"]

  // Available themes - add new themes here
  static themes = [
    { id: "light", name: "Light", icon: "sun" },
    { id: "dark", name: "Dark", icon: "moon" },
    { id: "gruvbox", name: "Gruvbox", icon: "palette" },
    { id: "tokyo-night", name: "Tokyo Night", icon: "palette" },
    { id: "solarized-dark", name: "Solarized Dark", icon: "palette" },
    { id: "solarized-light", name: "Solarized Light", icon: "palette" },
    { id: "nord", name: "Nord", icon: "palette" },
    { id: "cappuccino", name: "Cappuccino", icon: "palette" },
    { id: "osaka", name: "Osaka", icon: "palette" },
    { id: "hackerman", name: "Hackerman", icon: "palette" }
  ]

  connect() {
    this.applyTheme()
    this.renderMenu()
    this.setupClickOutside()
  }

  toggle(event) {
    event.stopPropagation()
    this.menuTarget.classList.toggle("hidden")
  }

  selectTheme(event) {
    const themeId = event.currentTarget.dataset.theme
    localStorage.setItem("theme", themeId)
    this.applyTheme()
    this.menuTarget.classList.add("hidden")
  }

  applyTheme() {
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const themeId = savedTheme || (prefersDark ? "dark" : "light")

    // Set data-theme attribute on html element
    document.documentElement.setAttribute("data-theme", themeId)

    // Also set dark class for Tailwind dark: variants
    const isDarkTheme = !["light", "solarized-light"].includes(themeId)
    document.documentElement.classList.toggle("dark", isDarkTheme)

    // Update current theme display
    if (this.hasCurrentThemeTarget) {
      const theme = this.constructor.themes.find(t => t.id === themeId)
      this.currentThemeTarget.textContent = theme ? theme.name : "Light"
    }

    // Update menu checkmarks
    if (this.hasMenuTarget) {
      this.menuTarget.querySelectorAll("[data-theme]").forEach(el => {
        const checkmark = el.querySelector(".checkmark")
        if (checkmark) {
          checkmark.classList.toggle("opacity-0", el.dataset.theme !== themeId)
        }
      })
    }
  }

  renderMenu() {
    if (!this.hasMenuTarget) return

    const currentTheme = localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")

    this.menuTarget.innerHTML = this.constructor.themes.map(theme => `
      <button
        type="button"
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--theme-bg-hover)] flex items-center justify-between gap-2"
        data-theme="${theme.id}"
        data-action="click->theme#selectTheme"
      >
        <span class="flex items-center gap-2">
          ${this.getIcon(theme.icon)}
          ${theme.name}
        </span>
        <svg class="w-4 h-4 checkmark ${theme.id !== currentTheme ? 'opacity-0' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    `).join("")
  }

  getIcon(iconType) {
    const icons = {
      sun: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>`,
      moon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>`,
      palette: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>`
    }
    return icons[iconType] || icons.palette
  }

  setupClickOutside() {
    document.addEventListener("click", (event) => {
      if (this.hasMenuTarget && !this.element.contains(event.target)) {
        this.menuTarget.classList.add("hidden")
      }
    })
  }
}
