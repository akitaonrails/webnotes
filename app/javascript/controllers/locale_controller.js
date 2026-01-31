import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu", "currentLocale"]
  static values = { initial: String }

  // Available locales
  static locales = [
    { id: "en", name: "English", flag: "us" },
    { id: "pt-BR", name: "Portugues (Brasil)", flag: "br" }
  ]

  connect() {
    // Load initial locale from server config
    this.currentLocaleId = this.hasInitialValue && this.initialValue ? this.initialValue : "en"
    this.translations = null
    this.loadTranslations()
    this.renderMenu()
    this.setupClickOutside()
    this.setupConfigListener()
  }

  disconnect() {
    if (this.boundConfigListener) {
      window.removeEventListener("frankmd:config-changed", this.boundConfigListener)
    }
    if (this.boundClickOutside) {
      document.removeEventListener("click", this.boundClickOutside)
    }
    if (this.configSaveTimeout) {
      clearTimeout(this.configSaveTimeout)
    }
  }

  // Load translations from server
  async loadTranslations() {
    try {
      const response = await fetch("/translations", {
        headers: { "Accept": "application/json" }
      })
      if (response.ok) {
        const data = await response.json()
        this.translations = data.translations
        this.currentLocaleId = data.locale
        // Make translations globally available
        window.frankmdTranslations = this.translations
        window.frankmdLocale = this.currentLocaleId
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent("frankmd:translations-loaded", {
          detail: { locale: this.currentLocaleId, translations: this.translations }
        }))
        this.updateDisplay()
      }
    } catch (error) {
      console.warn("Failed to load translations:", error)
    }
  }

  // Listen for config changes (when .fed file is edited)
  setupConfigListener() {
    this.boundConfigListener = (event) => {
      const { locale } = event.detail
      if (locale && locale !== this.currentLocaleId) {
        this.currentLocaleId = locale
        this.loadTranslations()
        this.renderMenu()
      }
    }
    window.addEventListener("frankmd:config-changed", this.boundConfigListener)
  }

  toggle(event) {
    event.stopPropagation()
    this.menuTarget.classList.toggle("hidden")
  }

  selectLocale(event) {
    const localeId = event.currentTarget.dataset.locale
    if (localeId === this.currentLocaleId) {
      this.menuTarget.classList.add("hidden")
      return
    }
    this.currentLocaleId = localeId
    this.saveLocaleConfig(localeId)
    this.menuTarget.classList.add("hidden")
  }

  // Save locale to server config and reload page
  saveLocaleConfig(localeId) {
    if (this.configSaveTimeout) {
      clearTimeout(this.configSaveTimeout)
    }

    this.configSaveTimeout = setTimeout(async () => {
      try {
        const response = await fetch("/config", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.content
          },
          body: JSON.stringify({ locale: localeId })
        })

        if (response.ok) {
          // Reload page to apply new locale
          window.location.reload()
        } else {
          console.warn("Failed to save locale config:", await response.text())
        }
      } catch (error) {
        console.warn("Failed to save locale config:", error)
      }
    }, 100)
  }

  updateDisplay() {
    if (this.hasCurrentLocaleTarget) {
      const locale = this.constructor.locales.find(l => l.id === this.currentLocaleId)
      this.currentLocaleTarget.textContent = locale ? locale.name : "English"
    }

    // Update menu checkmarks
    if (this.hasMenuTarget) {
      this.menuTarget.querySelectorAll("[data-locale]").forEach(el => {
        const checkmark = el.querySelector(".checkmark")
        if (checkmark) {
          checkmark.classList.toggle("opacity-0", el.dataset.locale !== this.currentLocaleId)
        }
      })
    }
  }

  renderMenu() {
    if (!this.hasMenuTarget) return

    this.menuTarget.innerHTML = this.constructor.locales.map(locale => `
      <button
        type="button"
        class="w-full px-3 py-2 text-left text-sm hover:bg-[var(--theme-bg-hover)] flex items-center justify-between gap-2"
        data-locale="${locale.id}"
        data-action="click->locale#selectLocale"
      >
        <span class="flex items-center gap-2">
          ${this.getFlag(locale.flag)}
          ${locale.name}
        </span>
        <svg class="w-4 h-4 checkmark ${locale.id !== this.currentLocaleId ? 'opacity-0' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    `).join("")
  }

  getFlag(flagCode) {
    // Simple flag emoji based on country code
    const flags = {
      us: `<span class="text-base">🇺🇸</span>`,
      br: `<span class="text-base">🇧🇷</span>`
    }
    return flags[flagCode] || ""
  }

  setupClickOutside() {
    this.boundClickOutside = (event) => {
      if (this.hasMenuTarget && !this.element.contains(event.target)) {
        this.menuTarget.classList.add("hidden")
      }
    }
    document.addEventListener("click", this.boundClickOutside)
  }
}

// Global translation helper function
// Usage: window.t("dialogs.rename.title") or window.t("status.matches_found", { count: 5, files: 3 })
window.t = function(key, options = {}) {
  const translations = window.frankmdTranslations || {}

  // Navigate the nested object using dot notation
  const keys = key.split(".")
  let value = translations

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k]
    } else {
      // Key not found, return the key itself as fallback
      return key
    }
  }

  // If value is not a string, return key as fallback
  if (typeof value !== "string") {
    return key
  }

  // Replace interpolation placeholders like %{count}
  return value.replace(/%\{(\w+)\}/g, (match, placeholder) => {
    return options[placeholder] !== undefined ? options[placeholder] : match
  })
}
