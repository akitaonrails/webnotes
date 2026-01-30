# frozen_string_literal: true

require "test_helper"

class YoutubeControllerTest < ActionDispatch::IntegrationTest
  test "config returns enabled false when no API key" do
    ENV.delete("YOUTUBE_API_KEY")

    get "/youtube/config", as: :json
    assert_response :success

    data = JSON.parse(response.body)
    assert_equal false, data["enabled"]
  end

  test "config returns enabled true when API key is set" do
    original_key = ENV["YOUTUBE_API_KEY"]
    ENV["YOUTUBE_API_KEY"] = "test_api_key"

    get "/youtube/config", as: :json
    assert_response :success

    data = JSON.parse(response.body)
    assert_equal true, data["enabled"]
  ensure
    if original_key
      ENV["YOUTUBE_API_KEY"] = original_key
    else
      ENV.delete("YOUTUBE_API_KEY")
    end
  end

  test "search returns error when no API key" do
    ENV.delete("YOUTUBE_API_KEY")

    get "/youtube/search", params: { q: "test" }, as: :json
    assert_response :service_unavailable

    data = JSON.parse(response.body)
    assert_includes data["error"], "not configured"
  end

  test "search returns error when query is blank" do
    get "/youtube/search", params: { q: "" }, as: :json
    assert_response :bad_request

    data = JSON.parse(response.body)
    assert_includes data["error"], "required"
  end
end
