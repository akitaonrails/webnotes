# frozen_string_literal: true

require "net/http"
require "json"

class YoutubeController < ApplicationController
  def config
    render json: { enabled: youtube_api_key.present? }
  end

  def search
    query = params[:q].to_s.strip

    if query.blank?
      render json: { error: t("errors.query_required") }, status: :bad_request
      return
    end

    unless youtube_api_key.present?
      render json: { error: t("errors.youtube_not_configured") }, status: :service_unavailable
      return
    end

    results = search_youtube(query)
    render json: results
  rescue StandardError => e
    Rails.logger.error("YouTube search error: #{e.message}")
    render json: { error: t("errors.search_failed") }, status: :internal_server_error
  end

  private

  def youtube_api_key
    ENV["YOUTUBE_API_KEY"]
  end

  def search_youtube(query)
    uri = URI("https://www.googleapis.com/youtube/v3/search")
    uri.query = URI.encode_www_form(
      part: "snippet",
      q: query,
      type: "video",
      maxResults: 6,
      key: youtube_api_key
    )

    response = Net::HTTP.get_response(uri)

    unless response.is_a?(Net::HTTPSuccess)
      Rails.logger.error("YouTube API error: #{response.code} - #{response.body}")
      return { error: "YouTube API error", videos: [] }
    end

    data = JSON.parse(response.body)

    videos = (data["items"] || []).map do |item|
      {
        id: item.dig("id", "videoId"),
        title: item.dig("snippet", "title"),
        channel: item.dig("snippet", "channelTitle"),
        thumbnail: item.dig("snippet", "thumbnails", "medium", "url") ||
                   item.dig("snippet", "thumbnails", "default", "url")
      }
    end

    { videos: videos }
  end
end
