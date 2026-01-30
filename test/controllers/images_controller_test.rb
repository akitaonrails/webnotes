# frozen_string_literal: true

require "test_helper"

class ImagesControllerTest < ActionDispatch::IntegrationTest
  # === config ===

  test "config returns enabled and s3 status" do
    get images_config_url, as: :json
    assert_response :success

    data = JSON.parse(response.body)
    assert_includes [ true, false ], data["enabled"]
    assert_includes [ true, false ], data["s3_enabled"]
  end

  # Tests that require images to be configured
  class WithImagesConfigured < ActionDispatch::IntegrationTest
    def setup
      @temp_dir = Rails.root.join("tmp", "test_images_#{SecureRandom.hex(8)}")
      FileUtils.mkdir_p(@temp_dir)

      # Store and set config
      @saved_path = Rails.application.config.webnotes_images.path
      @saved_enabled = Rails.application.config.webnotes_images.enabled
      @saved_s3 = Rails.application.config.webnotes_images.s3_enabled

      Rails.application.config.webnotes_images.path = @temp_dir.to_s
      Rails.application.config.webnotes_images.enabled = true
      Rails.application.config.webnotes_images.s3_enabled = false

      ImagesService.instance_variable_set(:@images_path, nil)
    end

    def teardown
      FileUtils.rm_rf(@temp_dir) if @temp_dir&.exist?

      Rails.application.config.webnotes_images.path = @saved_path
      Rails.application.config.webnotes_images.enabled = @saved_enabled
      Rails.application.config.webnotes_images.s3_enabled = @saved_s3

      ImagesService.instance_variable_set(:@images_path, nil)
    end

    def create_test_image(name)
      path = @temp_dir.join(name)
      FileUtils.mkdir_p(path.dirname)
      png_data = [
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xFE, 0xD4, 0xE7, 0x00, 0x00,
        0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ].pack("C*")
      File.binwrite(path, png_data)
      path
    end

    test "config returns enabled when configured" do
      get images_config_url, as: :json
      assert_response :success

      data = JSON.parse(response.body)
      assert_equal true, data["enabled"]
    end

    test "index returns list of images" do
      create_test_image("photo1.jpg")
      create_test_image("photo2.png")

      get images_url, as: :json
      assert_response :success

      images = JSON.parse(response.body)
      assert_equal 2, images.length
    end

    test "index filters by search" do
      create_test_image("cat.jpg")
      create_test_image("dog.jpg")

      get images_url, params: { search: "cat" }, as: :json
      assert_response :success

      images = JSON.parse(response.body)
      assert_equal 1, images.length
      assert_equal "cat.jpg", images[0]["name"]
    end

    test "preview serves image file" do
      create_test_image("test.png")

      get "/images/preview/test.png"
      assert_response :success
    end

    test "preview returns 404 for non-existent image" do
      get image_preview_url(path: "nonexistent.jpg")
      assert_response :not_found
    end
  end

  # Tests for disabled state
  class WithImagesDisabled < ActionDispatch::IntegrationTest
    def setup
      @saved_enabled = Rails.application.config.webnotes_images.enabled
      Rails.application.config.webnotes_images.enabled = false
    end

    def teardown
      Rails.application.config.webnotes_images.enabled = @saved_enabled
    end

    test "config returns disabled" do
      get images_config_url, as: :json
      assert_response :success

      data = JSON.parse(response.body)
      assert_equal false, data["enabled"]
    end

    test "index returns 404 when images disabled" do
      get images_url, as: :json
      assert_response :not_found
    end

    test "preview returns 404 when images disabled" do
      get image_preview_url(path: "test.jpg")
      assert_response :not_found
    end
  end
end
