/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { Application } from "@hotwired/stimulus"
import VideoDialogController from "../../../app/javascript/controllers/video_dialog_controller.js"

describe("VideoDialogController", () => {
  let application, controller, element

  beforeEach(() => {
    // Mock window.t for translations
    window.t = vi.fn((key) => key)

    document.body.innerHTML = `
      <div data-controller="video-dialog">
        <dialog data-video-dialog-target="dialog"></dialog>
        <button data-video-dialog-target="tabUrl" data-tab="url"></button>
        <button data-video-dialog-target="tabSearch" data-tab="search"></button>
        <div data-video-dialog-target="urlPanel"></div>
        <div data-video-dialog-target="searchPanel" class="hidden"></div>
        <input data-video-dialog-target="videoUrl" type="text" />
        <div data-video-dialog-target="videoPreview"></div>
        <button data-video-dialog-target="insertVideoBtn" disabled></button>
        <input data-video-dialog-target="youtubeSearchInput" type="text" />
        <button data-video-dialog-target="youtubeSearchBtn"></button>
        <div data-video-dialog-target="youtubeSearchStatus"></div>
        <div data-video-dialog-target="youtubeSearchResults"></div>
        <div data-video-dialog-target="youtubeConfigNotice"></div>
        <div data-video-dialog-target="youtubeSearchForm"></div>
      </div>
    `

    // Mock showModal and close for dialog
    HTMLDialogElement.prototype.showModal = vi.fn(function () {
      this.open = true
    })
    HTMLDialogElement.prototype.close = vi.fn(function () {
      this.open = false
    })

    // Mock fetch for YouTube config check
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ enabled: false })
    })

    element = document.querySelector('[data-controller="video-dialog"]')
    application = Application.start()
    application.register("video-dialog", VideoDialogController)

    return new Promise((resolve) => {
      setTimeout(() => {
        controller = application.getControllerForElementAndIdentifier(element, "video-dialog")
        resolve()
      }, 0)
    })
  })

  afterEach(() => {
    application.stop()
    vi.restoreAllMocks()
  })

  describe("connect()", () => {
    it("initializes empty search results", () => {
      expect(controller.youtubeSearchResults).toEqual([])
    })

    it("initializes selected index to -1", () => {
      expect(controller.selectedYoutubeIndex).toBe(-1)
    })

    it("checks YouTube API availability", () => {
      expect(global.fetch).toHaveBeenCalledWith("/youtube/config")
    })
  })

  describe("open()", () => {
    it("shows the dialog", () => {
      controller.open()

      expect(controller.dialogTarget.showModal).toHaveBeenCalled()
    })

    it("resets video URL input", () => {
      controller.videoUrlTarget.value = "https://example.com/video"
      controller.open()

      expect(controller.videoUrlTarget.value).toBe("")
    })

    it("disables insert button", () => {
      controller.insertVideoBtnTarget.disabled = false
      controller.open()

      expect(controller.insertVideoBtnTarget.disabled).toBe(true)
    })

    it("resets detected video type", () => {
      controller.detectedVideoType = "youtube"
      controller.detectedVideoData = { id: "abc123" }
      controller.open()

      expect(controller.detectedVideoType).toBeNull()
      expect(controller.detectedVideoData).toBeNull()
    })

    it("resets search results", () => {
      controller.youtubeSearchResults = [{ id: "abc" }]
      controller.selectedYoutubeIndex = 0
      controller.open()

      expect(controller.youtubeSearchResults).toEqual([])
      expect(controller.selectedYoutubeIndex).toBe(-1)
    })
  })

  describe("close()", () => {
    it("closes the dialog", () => {
      controller.open()
      controller.close()

      expect(controller.dialogTarget.close).toHaveBeenCalled()
    })
  })

  describe("switchTab()", () => {
    it("shows URL panel when URL tab selected", () => {
      const event = { currentTarget: { dataset: { tab: "url" } } }
      controller.switchTab(event)

      expect(controller.urlPanelTarget.classList.contains("hidden")).toBe(false)
      expect(controller.searchPanelTarget.classList.contains("hidden")).toBe(true)
    })

    it("shows search panel when search tab selected", () => {
      const event = { currentTarget: { dataset: { tab: "search" } } }
      controller.switchTab(event)

      expect(controller.urlPanelTarget.classList.contains("hidden")).toBe(true)
      expect(controller.searchPanelTarget.classList.contains("hidden")).toBe(false)
    })
  })

  describe("onVideoUrlInput()", () => {
    it("disables insert button when URL is empty", () => {
      controller.videoUrlTarget.value = ""
      controller.onVideoUrlInput()

      expect(controller.insertVideoBtnTarget.disabled).toBe(true)
      expect(controller.detectedVideoType).toBeNull()
    })

    it("detects YouTube URL", () => {
      controller.videoUrlTarget.value = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      controller.onVideoUrlInput()

      expect(controller.detectedVideoType).toBe("youtube")
      expect(controller.detectedVideoData.id).toBe("dQw4w9WgXcQ")
      expect(controller.insertVideoBtnTarget.disabled).toBe(false)
    })

    it("detects short YouTube URL", () => {
      controller.videoUrlTarget.value = "https://youtu.be/dQw4w9WgXcQ"
      controller.onVideoUrlInput()

      expect(controller.detectedVideoType).toBe("youtube")
      expect(controller.detectedVideoData.id).toBe("dQw4w9WgXcQ")
    })

    it("detects video file URL", () => {
      controller.videoUrlTarget.value = "https://example.com/video.mp4"
      controller.onVideoUrlInput()

      expect(controller.detectedVideoType).toBe("file")
      expect(controller.detectedVideoData.url).toBe("https://example.com/video.mp4")
      expect(controller.insertVideoBtnTarget.disabled).toBe(false)
    })

    it("detects WebM file URL", () => {
      controller.videoUrlTarget.value = "https://example.com/video.webm"
      controller.onVideoUrlInput()

      expect(controller.detectedVideoType).toBe("file")
    })

    it("shows unknown format for invalid URLs", () => {
      controller.videoUrlTarget.value = "https://example.com/page.html"
      controller.onVideoUrlInput()

      expect(controller.detectedVideoType).toBeNull()
      expect(controller.insertVideoBtnTarget.disabled).toBe(true)
    })
  })

  describe("onVideoUrlKeydown()", () => {
    it("calls insertVideo on Enter when button is enabled", () => {
      const insertSpy = vi.spyOn(controller, "insertVideo")
      controller.insertVideoBtnTarget.disabled = false
      const event = { key: "Enter", preventDefault: vi.fn() }

      controller.onVideoUrlKeydown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(insertSpy).toHaveBeenCalled()
    })

    it("does not call insertVideo when button is disabled", () => {
      const insertSpy = vi.spyOn(controller, "insertVideo")
      controller.insertVideoBtnTarget.disabled = true
      const event = { key: "Enter", preventDefault: vi.fn() }

      controller.onVideoUrlKeydown(event)

      expect(insertSpy).not.toHaveBeenCalled()
    })
  })

  describe("insertVideo()", () => {
    it("closes dialog when no video type detected", () => {
      const closeSpy = vi.spyOn(controller, "close")
      controller.detectedVideoType = null

      controller.insertVideo()

      expect(closeSpy).toHaveBeenCalled()
    })

    it("dispatches video-selected event for YouTube video", () => {
      const handler = vi.fn()
      element.addEventListener("video-dialog:video-selected", handler)

      controller.detectedVideoType = "youtube"
      controller.detectedVideoData = { id: "abc123" }
      controller.insertVideo()

      expect(handler).toHaveBeenCalled()
      const embedCode = handler.mock.calls[0][0].detail.embedCode
      expect(embedCode).toContain("youtube.com/embed/abc123")
    })

    it("dispatches video-selected event for video file", () => {
      const handler = vi.fn()
      element.addEventListener("video-dialog:video-selected", handler)

      controller.detectedVideoType = "file"
      controller.detectedVideoData = { url: "https://example.com/video.mp4" }
      controller.insertVideo()

      expect(handler).toHaveBeenCalled()
      const embedCode = handler.mock.calls[0][0].detail.embedCode
      expect(embedCode).toContain("video controls")
      expect(embedCode).toContain("video.mp4")
      expect(embedCode).toContain("video/mp4")
    })

    it("closes dialog after inserting", () => {
      const closeSpy = vi.spyOn(controller, "close")

      controller.detectedVideoType = "youtube"
      controller.detectedVideoData = { id: "abc123" }
      controller.insertVideo()

      expect(closeSpy).toHaveBeenCalled()
    })
  })

  describe("searchYoutube()", () => {
    it("shows error when query is empty", async () => {
      controller.youtubeSearchInputTarget.value = ""
      await controller.searchYoutube()

      expect(controller.youtubeSearchStatusTarget.textContent).toBe("status.please_enter_keywords")
    })

    it("shows error when YouTube API is not enabled", async () => {
      controller.youtubeApiEnabled = false
      controller.youtubeSearchInputTarget.value = "test query"

      await controller.searchYoutube()

      expect(controller.youtubeSearchStatusTarget.innerHTML).toContain("youtube_not_configured")
    })

    it("fetches search results when API is enabled", async () => {
      controller.youtubeApiEnabled = true
      controller.youtubeSearchInputTarget.value = "test query"

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          videos: [
            { id: "vid1", title: "Video 1", channel: "Channel", thumbnail: "thumb.jpg" }
          ]
        })
      })

      await controller.searchYoutube()

      expect(global.fetch).toHaveBeenCalledWith("/youtube/search?q=test%20query")
    })

    it("stores search results", async () => {
      controller.youtubeApiEnabled = true
      controller.youtubeSearchInputTarget.value = "test"

      const mockVideos = [
        { id: "vid1", title: "Video 1", channel: "Channel", thumbnail: "thumb.jpg" }
      ]
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ videos: mockVideos })
      })

      await controller.searchYoutube()

      expect(controller.youtubeSearchResults).toEqual(mockVideos)
    })

    it("handles search errors", async () => {
      controller.youtubeApiEnabled = true
      controller.youtubeSearchInputTarget.value = "test"

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

      await controller.searchYoutube()

      expect(controller.youtubeSearchStatusTarget.innerHTML).toContain("search_failed")
      expect(controller.youtubeSearchResults).toEqual([])
    })

    it("shows no results message when empty", async () => {
      controller.youtubeApiEnabled = true
      controller.youtubeSearchInputTarget.value = "test"

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ videos: [] })
      })

      await controller.searchYoutube()

      expect(controller.youtubeSearchStatusTarget.textContent).toBe("status.no_videos_found")
    })
  })

  describe("renderYoutubeResults()", () => {
    it("clears results when empty", () => {
      controller.youtubeSearchResults = []
      controller.renderYoutubeResults()

      expect(controller.youtubeSearchResultsTarget.innerHTML).toBe("")
    })

    it("renders video cards", () => {
      controller.youtubeSearchResults = [
        { id: "vid1", title: "Test Video", channel: "Test Channel", thumbnail: "https://example.com/thumb.jpg" }
      ]
      controller.renderYoutubeResults()

      const html = controller.youtubeSearchResultsTarget.innerHTML
      expect(html).toContain("vid1")
      expect(html).toContain("Test Video")
      expect(html).toContain("Test Channel")
    })

    it("highlights selected video", () => {
      controller.youtubeSearchResults = [
        { id: "vid1", title: "Video 1", channel: "Channel", thumbnail: "thumb.jpg" },
        { id: "vid2", title: "Video 2", channel: "Channel", thumbnail: "thumb.jpg" }
      ]
      controller.selectedYoutubeIndex = 1
      controller.renderYoutubeResults()

      const buttons = controller.youtubeSearchResultsTarget.querySelectorAll("button")
      expect(buttons[1].className).toContain("ring-2")
    })
  })

  describe("selectYoutubeVideo()", () => {
    it("dispatches video-selected event with embed code", () => {
      const handler = vi.fn()
      element.addEventListener("video-dialog:video-selected", handler)

      const event = {
        currentTarget: {
          dataset: { videoId: "xyz789", videoTitle: "Test Title" }
        }
      }
      controller.selectYoutubeVideo(event)

      expect(handler).toHaveBeenCalled()
      const embedCode = handler.mock.calls[0][0].detail.embedCode
      expect(embedCode).toContain("youtube.com/embed/xyz789")
      expect(embedCode).toContain("Test Title")
    })

    it("does nothing when videoId is missing", () => {
      const handler = vi.fn()
      element.addEventListener("video-dialog:video-selected", handler)

      const event = {
        currentTarget: { dataset: {} }
      }
      controller.selectYoutubeVideo(event)

      expect(handler).not.toHaveBeenCalled()
    })

    it("closes dialog after selection", () => {
      const closeSpy = vi.spyOn(controller, "close")

      const event = {
        currentTarget: {
          dataset: { videoId: "xyz789", videoTitle: "Test" }
        }
      }
      controller.selectYoutubeVideo(event)

      expect(closeSpy).toHaveBeenCalled()
    })
  })

  describe("onYoutubeSearchKeydown()", () => {
    it("triggers search on Enter", () => {
      const searchSpy = vi.spyOn(controller, "searchYoutube")
      const event = { key: "Enter", preventDefault: vi.fn() }

      controller.onYoutubeSearchKeydown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(searchSpy).toHaveBeenCalled()
    })

    it("navigates to first result on ArrowDown", () => {
      controller.youtubeSearchResults = [
        { id: "vid1", title: "Video", channel: "Ch", thumbnail: "t.jpg" }
      ]
      controller.renderYoutubeResults()

      const event = { key: "ArrowDown", preventDefault: vi.fn() }
      controller.onYoutubeSearchKeydown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(controller.selectedYoutubeIndex).toBe(0)
    })
  })
})
