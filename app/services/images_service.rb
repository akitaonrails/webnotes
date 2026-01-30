# frozen_string_literal: true

class ImagesService
  SUPPORTED_EXTENSIONS = %w[.jpg .jpeg .png .gif .webp .svg .bmp].freeze
  MAX_RESULTS = 10

  class << self
    def enabled?
      config.enabled
    end

    def s3_enabled?
      config.s3_enabled
    end

    def images_path
      return nil unless enabled?
      @images_path ||= Pathname.new(config.path).expand_path
    end

    def list(search: nil)
      return [] unless enabled?
      return [] unless images_path.exist?

      files = find_images(search)
        .sort_by { |f| -f.mtime.to_i }  # Most recent first
        .first(MAX_RESULTS)

      files.map do |file|
        relative_path = file.relative_path_from(images_path).to_s
        {
          name: file.basename.to_s,
          path: relative_path,
          full_path: file.to_s,
          mtime: file.mtime.iso8601,
          size: file.size
        }
      end
    end

    def find_image(path)
      return nil unless enabled?

      full_path = safe_path(path)
      return nil unless full_path&.exist? && full_path&.file?

      full_path
    end

    def upload_to_s3(path)
      return nil unless s3_enabled?

      full_path = find_image(path)
      return nil unless full_path

      require "aws-sdk-s3"

      client = Aws::S3::Client.new(
        access_key_id: config.aws_access_key_id,
        secret_access_key: config.aws_secret_access_key,
        region: config.aws_region
      )

      key = "webnotes/#{Time.current.strftime('%Y/%m')}/#{full_path.basename}"

      # Read file content
      file_content = full_path.binread
      content_type = content_type_for(full_path)

      # Upload without ACL first (works with buckets that have ACLs disabled)
      begin
        client.put_object(
          bucket: config.aws_s3_bucket,
          key: key,
          body: file_content,
          content_type: content_type
        )
      rescue Aws::S3::Errors::AccessControlListNotSupported
        # Bucket has ACLs disabled, which is fine for public buckets with policies
        # The object was still uploaded successfully
      end

      "https://#{config.aws_s3_bucket}.s3.#{config.aws_region}.amazonaws.com/#{key}"
    end

    def download_and_upload_to_s3(url)
      return nil unless s3_enabled?

      require "aws-sdk-s3"
      require "net/http"
      require "securerandom"

      # Download the image
      uri = URI(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == "https"
      http.open_timeout = 10
      http.read_timeout = 30

      request = Net::HTTP::Get.new(uri)
      request["User-Agent"] = "Mozilla/5.0 (compatible; WebNotes/1.0)"

      response = http.request(request)

      unless response.is_a?(Net::HTTPSuccess)
        Rails.logger.error "Failed to download image: #{response.code}"
        return nil
      end

      file_content = response.body
      content_type = response["Content-Type"] || "image/jpeg"

      # Generate filename from URL or use random name
      extension = extension_for_content_type(content_type)
      original_name = File.basename(uri.path).gsub(/[^a-zA-Z0-9._-]/, "_")
      if original_name.blank? || original_name == "_" || !original_name.match?(/\.\w+$/)
        original_name = "#{SecureRandom.hex(8)}#{extension}"
      end

      client = Aws::S3::Client.new(
        access_key_id: config.aws_access_key_id,
        secret_access_key: config.aws_secret_access_key,
        region: config.aws_region
      )

      key = "webnotes/#{Time.current.strftime('%Y/%m')}/#{original_name}"

      begin
        client.put_object(
          bucket: config.aws_s3_bucket,
          key: key,
          body: file_content,
          content_type: content_type
        )
      rescue Aws::S3::Errors::AccessControlListNotSupported
        # Bucket has ACLs disabled, which is fine
      end

      "https://#{config.aws_s3_bucket}.s3.#{config.aws_region}.amazonaws.com/#{key}"
    end

    private

    def config
      Rails.application.config.webnotes_images
    end

    def find_images(search)
      pattern = images_path.join("**", "*")
      Pathname.glob(pattern).select do |file|
        next false unless file.file?
        next false unless SUPPORTED_EXTENSIONS.include?(file.extname.downcase)
        next false if search.present? && !file.basename.to_s.downcase.include?(search.downcase)
        true
      end
    end

    def safe_path(path)
      return nil if path.blank?

      # Prevent path traversal
      clean_path = Pathname.new(path).cleanpath
      return nil if clean_path.to_s.start_with?("..")

      full_path = images_path.join(clean_path)

      # Ensure the path is within images_path
      return nil unless full_path.to_s.start_with?(images_path.to_s)

      full_path
    end

    def content_type_for(path)
      case path.extname.downcase
      when ".jpg", ".jpeg" then "image/jpeg"
      when ".png" then "image/png"
      when ".gif" then "image/gif"
      when ".webp" then "image/webp"
      when ".svg" then "image/svg+xml"
      when ".bmp" then "image/bmp"
      else "application/octet-stream"
      end
    end

    def extension_for_content_type(content_type)
      case content_type.to_s.split(";").first.strip.downcase
      when "image/jpeg" then ".jpg"
      when "image/png" then ".png"
      when "image/gif" then ".gif"
      when "image/webp" then ".webp"
      when "image/svg+xml" then ".svg"
      when "image/bmp" then ".bmp"
      else ".jpg"
      end
    end
  end
end
