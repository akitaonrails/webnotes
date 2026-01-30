# frozen_string_literal: true

# Images configuration (using webnotes_images to avoid Rails config conflicts)
Rails.application.config.webnotes_images = ActiveSupport::OrderedOptions.new

# Local images path
# Priority: IMAGES_PATH env var > XDG_PICTURES_DIR > ~/Pictures (if exists)
images_path = ENV["IMAGES_PATH"]
images_path ||= ENV["XDG_PICTURES_DIR"]
images_path ||= File.expand_path("~/Pictures") if File.directory?(File.expand_path("~/Pictures"))

Rails.application.config.webnotes_images.path = images_path

# AWS S3 configuration
# Uses standard AWS SDK environment variables automatically
Rails.application.config.webnotes_images.aws_access_key_id = ENV["AWS_ACCESS_KEY_ID"]
Rails.application.config.webnotes_images.aws_secret_access_key = ENV["AWS_SECRET_ACCESS_KEY"]
Rails.application.config.webnotes_images.aws_region = ENV["AWS_REGION"] || ENV["AWS_DEFAULT_REGION"] || "us-east-1"
Rails.application.config.webnotes_images.aws_s3_bucket = ENV["AWS_S3_BUCKET"]

# Helper flags
Rails.application.config.webnotes_images.enabled = Rails.application.config.webnotes_images.path.present?
Rails.application.config.webnotes_images.s3_enabled = [
  Rails.application.config.webnotes_images.aws_access_key_id,
  Rails.application.config.webnotes_images.aws_secret_access_key,
  Rails.application.config.webnotes_images.aws_s3_bucket
].all?(&:present?)
