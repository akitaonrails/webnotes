# frozen_string_literal: true

require "net/http"
require "json"

class ImagesController < ApplicationController
  skip_forgery_protection only: [ :upload_to_s3, :upload_external_to_s3 ]
  before_action :require_images_enabled, except: [ :config, :search_google, :search_pinterest ]

  # GET /images/config
  def config
    render json: {
      enabled: ImagesService.enabled?,
      s3_enabled: ImagesService.s3_enabled?,
      web_search_enabled: true,    # Uses DuckDuckGo/Bing (no API needed)
      google_enabled: google_api_configured?,  # Requires API keys
      pinterest_enabled: true      # Uses DuckDuckGo with site filter (no API needed)
    }
  end

  # GET /images
  def index
    images = ImagesService.list(search: params[:search])
    render json: images
  end

  # GET /images/preview/*path
  def preview
    path = params[:path]
    full_path = ImagesService.find_image(path)

    if full_path
      send_file full_path, disposition: "inline"
    else
      head :not_found
    end
  end

  # POST /images/upload_to_s3
  def upload_to_s3
    unless ImagesService.s3_enabled?
      return render json: { error: "S3 not configured" }, status: :unprocessable_entity
    end

    path = params[:path]
    resize_ratio = parse_resize_ratio(params[:resize])
    s3_url = ImagesService.upload_to_s3(path, resize: resize_ratio)

    if s3_url
      render json: { url: s3_url }
    else
      render json: { error: "Failed to upload" }, status: :unprocessable_entity
    end
  rescue StandardError => e
    Rails.logger.error "S3 upload error: #{e.class} - #{e.message}"
    Rails.logger.error e.backtrace.first(10).join("\n")
    render json: { error: "#{e.class}: #{e.message}" }, status: :unprocessable_entity
  end

  # POST /images/upload_external_to_s3
  def upload_external_to_s3
    unless ImagesService.s3_enabled?
      return render json: { error: "S3 not configured" }, status: :unprocessable_entity
    end

    url = params[:url].to_s.strip
    if url.blank?
      return render json: { error: "URL is required" }, status: :bad_request
    end

    resize_ratio = parse_resize_ratio(params[:resize])
    s3_url = ImagesService.download_and_upload_to_s3(url, resize: resize_ratio)
    if s3_url
      render json: { url: s3_url }
    else
      render json: { error: "Failed to upload" }, status: :unprocessable_entity
    end
  rescue StandardError => e
    Rails.logger.error "External S3 upload error: #{e.class} - #{e.message}"
    render json: { error: "#{e.class}: #{e.message}" }, status: :unprocessable_entity
  end

  # GET /images/search_web (uses DuckDuckGo/Bing - no API needed)
  def search_web
    query = params[:q].to_s.strip

    if query.blank?
      return render json: { error: "Query is required" }, status: :bad_request
    end

    results = search_duckduckgo_images(query, nil)
    render json: results
  rescue StandardError => e
    Rails.logger.error "Web search error: #{e.message}"
    render json: { error: "Search failed" }, status: :internal_server_error
  end

  # GET /images/search_google (uses Google Custom Search API)
  def search_google
    query = params[:q].to_s.strip
    start = params[:start].to_i

    if query.blank?
      return render json: { error: "Query is required" }, status: :bad_request
    end

    unless google_api_configured?
      return render json: { error: "Google Custom Search not configured" }, status: :service_unavailable
    end

    results = search_google_images(query, start)
    render json: results
  rescue StandardError => e
    Rails.logger.error "Google search error: #{e.message}"
    render json: { error: "Search failed" }, status: :internal_server_error
  end

  # GET /images/search_pinterest
  def search_pinterest
    query = params[:q].to_s.strip

    if query.blank?
      return render json: { error: "Query is required" }, status: :bad_request
    end

    # Pinterest doesn't have a public API, so we'll use DuckDuckGo image search
    # filtered to pinterest.com domain as a workaround
    results = search_duckduckgo_images(query, "pinterest.com")
    render json: results
  rescue StandardError => e
    Rails.logger.error "Pinterest search error: #{e.message}"
    render json: { error: "Search failed" }, status: :internal_server_error
  end

  private

  def require_images_enabled
    unless ImagesService.enabled?
      render json: { error: "Images not configured" }, status: :not_found
    end
  end

  def google_api_configured?
    ENV["GOOGLE_API_KEY"].present? && ENV["GOOGLE_CSE_ID"].present?
  end

  def parse_resize_ratio(value)
    # Handle legacy boolean values for backwards compatibility
    return 0.5 if value == true || value == "true"
    return nil if value.blank? || value == "" || value == "false" || value == false

    # Parse ratio as float (e.g., "0.25", "0.5", "0.67")
    ratio = value.to_f
    ratio > 0 && ratio <= 1 ? ratio : nil
  end

  def search_google_images(query, start = 0)
    uri = URI("https://www.googleapis.com/customsearch/v1")
    uri.query = URI.encode_www_form(
      key: ENV["GOOGLE_API_KEY"],
      cx: ENV["GOOGLE_CSE_ID"],
      q: query,
      searchType: "image",
      num: 10,
      start: [ start, 1 ].max,
      safe: "active"
    )

    response = Net::HTTP.get_response(uri)

    unless response.is_a?(Net::HTTPSuccess)
      Rails.logger.error "Google API error: #{response.code} - #{response.body}"
      return { error: "Google API error", images: [] }
    end

    data = JSON.parse(response.body)

    images = (data["items"] || []).map do |item|
      {
        url: item["link"],
        thumbnail: item.dig("image", "thumbnailLink") || item["link"],
        title: item["title"],
        source: item["displayLink"],
        width: item.dig("image", "width"),
        height: item.dig("image", "height")
      }
    end

    {
      images: images,
      total: data.dig("searchInformation", "totalResults").to_i,
      next_start: start + 10
    }
  end

  def search_duckduckgo_images(query, site_filter = nil)
    # DuckDuckGo's image search API is unofficial and changes frequently
    # Using an alternative approach with their HTML endpoint
    search_query = site_filter ? "#{query} site:#{site_filter}" : query

    uri = URI("https://duckduckgo.com/")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 5
    http.read_timeout = 10

    # First request to get vqd token
    request = Net::HTTP::Get.new("/?q=#{URI.encode_www_form_component(search_query)}&iax=images&ia=images")
    request["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    request["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"

    response = http.request(request)
    Rails.logger.debug "DuckDuckGo initial response code: #{response.code}"

    # Try multiple patterns to find vqd token
    vqd = nil
    [ /vqd=["']?([\d-]+)["']?/, /vqd=([\d-]+)/, /"vqd":"([\d-]+)"/ ].each do |pattern|
      match = response.body.match(pattern)
      if match
        vqd = match[1]
        break
      end
    end

    unless vqd
      Rails.logger.error "Could not get DuckDuckGo vqd token. Response length: #{response.body.length}"
      # Fallback: return empty but don't error out
      return { images: [], note: "DuckDuckGo search temporarily unavailable" }
    end

    Rails.logger.debug "Got vqd token: #{vqd}"

    # Fetch images
    img_uri = URI("https://duckduckgo.com/i.js")
    img_uri.query = URI.encode_www_form(
      l: "us-en",
      o: "json",
      q: search_query,
      vqd: vqd,
      f: ",,,,,",
      p: "1"
    )

    img_request = Net::HTTP::Get.new(img_uri)
    img_request["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    img_request["Accept"] = "application/json, text/javascript, */*; q=0.01"
    img_request["Referer"] = "https://duckduckgo.com/"

    img_response = http.request(img_request)
    Rails.logger.debug "DuckDuckGo image response code: #{img_response.code}, length: #{img_response.body.length}"

    unless img_response.is_a?(Net::HTTPSuccess)
      Rails.logger.error "DuckDuckGo image fetch failed: #{img_response.code}"
      return { images: [], error: "Failed to fetch images" }
    end

    data = JSON.parse(img_response.body)
    Rails.logger.debug "DuckDuckGo results count: #{data["results"]&.length || 0}"

    images = (data["results"] || []).first(20).map do |item|
      {
        url: item["image"],
        thumbnail: item["thumbnail"],
        title: item["title"],
        source: item["source"],
        width: item["width"],
        height: item["height"]
      }
    end

    { images: images }
  rescue JSON::ParserError => e
    Rails.logger.error "DuckDuckGo parse error: #{e.message}"
    { images: [], error: "Failed to parse results" }
  rescue StandardError => e
    Rails.logger.error "DuckDuckGo search error: #{e.class} - #{e.message}"
    Rails.logger.error e.backtrace.first(5).join("\n")
    { images: [], error: "Search failed" }
  end
end
