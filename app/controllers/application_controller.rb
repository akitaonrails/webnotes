class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Changes to the importmap will invalidate the etag for HTML responses
  stale_when_importmap_changes

  before_action :set_locale

  private

  def set_locale
    locale = params[:locale] ||
             session[:locale] ||
             ENV["FRANKMD_LOCALE"] ||
             current_config&.get("locale") ||
             I18n.default_locale

    I18n.locale = locale.to_s.to_sym if I18n.available_locales.include?(locale.to_s.to_sym)
  end

  def current_config
    @current_config ||= begin
      base_path = ENV.fetch("NOTES_PATH", Rails.root.join("notes"))
      Config.new(base_path: base_path)
    rescue
      nil
    end
  end
end
