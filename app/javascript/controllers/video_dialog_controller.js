import { Controller } from "@hotwired/stimulus"
import { escapeHtml } from "lib/text_utils"
import { extractYouTubeId } from "lib/url_utils"

// Video Dialog Controller
// Handles video embedding from URLs and YouTube search
// Dispatches video-selected event with embed code

export default class extends Controller {
  static targets = [
    "dialog",
    "tabUrl", "tabSearch",
    "urlPanel", "searchPanel",
    "videoUrl", "videoPreview", "insertVideoBtn",
    "youtubeSearchInput", "youtubeSearchBtn",
    "youtubeSearchStatus", "youtubeSearchResults",
    "youtubeConfigNotice", "youtubeSearchForm"
  ]

  connect() {
    this.youtubeSearchResults = []
    this.selectedYoutubeIndex = -1
    this.youtubeApiEnabled = false
    this.detectedVideoType = null
    this.detectedVideoData = null

    this.checkYoutubeApiEnabled()
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

  open() {
    // Reset URL tab
    this.videoUrlTarget.value = ""
    this.videoPreviewTarget.innerHTML = `<span class="text-[var(--theme-text-muted)]">${window.t("dialogs.video.preview_hint")}</span>`
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
    this.switchTab({ currentTarget: { dataset: { tab: "url" } } })

    this.dialogTarget.showModal()
    this.videoUrlTarget.focus()
  }

  close() {
    this.dialogTarget.close()
  }

  switchTab(event) {
    const tab = event.currentTarget.dataset.tab

    // Update tab buttons
    const urlTabClasses = tab === "url"
      ? "border-[var(--theme-accent)] text-[var(--theme-accent)]"
      : "border-transparent text-[var(--theme-text-muted)] hover:text-[var(--theme-text-secondary)]"
    const searchTabClasses = tab === "search"
      ? "border-[var(--theme-accent)] text-[var(--theme-accent)]"
      : "border-transparent text-[var(--theme-text-muted)] hover:text-[var(--theme-text-secondary)]"

    this.tabUrlTarget.className = `px-4 py-2 text-sm font-medium border-b-2 ${urlTabClasses}`
    this.tabSearchTarget.className = `px-4 py-2 text-sm font-medium border-b-2 ${searchTabClasses}`

    // Show/hide panels
    this.urlPanelTarget.classList.toggle("hidden", tab !== "url")
    this.searchPanelTarget.classList.toggle("hidden", tab !== "search")

    // Focus appropriate input
    if (tab === "url") {
      this.videoUrlTarget.focus()
    } else if (tab === "search" && this.hasYoutubeSearchInputTarget && this.youtubeApiEnabled) {
      this.youtubeSearchInputTarget.focus()
    }
  }

  onVideoUrlInput() {
    const url = this.videoUrlTarget.value.trim()

    if (!url) {
      this.videoPreviewTarget.innerHTML = `<span class="text-[var(--theme-text-muted)]">${window.t("dialogs.video.preview_hint")}</span>`
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
    this.videoPreviewTarget.innerHTML = `<span class="text-[var(--theme-warning)]">${window.t("dialogs.video.unknown_format")}</span>`
    this.insertVideoBtnTarget.disabled = true
  }

  onVideoUrlKeydown(event) {
    if (event.key === "Enter" && !this.insertVideoBtnTarget.disabled) {
      event.preventDefault()
      this.insertVideo()
    }
  }

  insertVideo() {
    if (!this.detectedVideoType) {
      this.close()
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

    this.dispatch("video-selected", { detail: { embedCode } })
    this.close()
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
          data-action="click->video-dialog#selectYoutubeVideo keydown->video-dialog#onYoutubeResultKeydown"
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

    if (!videoId) {
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

    this.dispatch("video-selected", { detail: { embedCode } })
    this.close()
  }
}
