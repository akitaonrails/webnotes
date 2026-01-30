# frozen_string_literal: true

class ConfigController < ApplicationController
  # Disable automatic parameter wrapping (Rails wraps JSON params under controller name)
  wrap_parameters false

  before_action :set_config

  # GET /config
  # Returns UI settings and feature availability
  def show
    render json: {
      settings: @config.ui_settings,
      features: {
        s3_upload: @config.feature_available?(:s3_upload),
        youtube_search: @config.feature_available?(:youtube_search),
        google_search: @config.feature_available?(:google_search),
        local_images: @config.feature_available?(:local_images)
      }
    }
  end

  # PATCH /config
  # Updates UI settings
  def update
    allowed_keys = Config::UI_KEYS
    updates = params.permit(*allowed_keys).to_h

    if updates.empty?
      render json: { error: "No valid settings provided" }, status: :unprocessable_entity
      return
    end

    if @config.update(updates)
      render json: {
        settings: @config.ui_settings,
        message: "Settings saved"
      }
    else
      render json: { error: "Failed to save settings" }, status: :unprocessable_entity
    end
  end

  private

  def set_config
    @config = Config.new
  end
end
