# frozen_string_literal: true

class ImagesController < ApplicationController
  skip_forgery_protection only: [ :upload_to_s3 ]
  before_action :require_images_enabled, except: [ :config ]

  # GET /images/config
  def config
    render json: {
      enabled: ImagesService.enabled?,
      s3_enabled: ImagesService.s3_enabled?
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
    s3_url = ImagesService.upload_to_s3(path)

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

  private

  def require_images_enabled
    unless ImagesService.enabled?
      render json: { error: "Images not configured" }, status: :not_found
    end
  end
end
