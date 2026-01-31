# frozen_string_literal: true

class TranslationsController < ApplicationController
  # GET /translations
  # Returns translations for JavaScript use
  def show
    js_keys = %w[common dialogs status errors success editor sidebar preview context_menu]
    translations = js_keys.each_with_object({}) do |key, hash|
      hash[key] = I18n.t(key, locale: I18n.locale, default: {})
    end
    render json: { locale: I18n.locale.to_s, translations: translations }
  end
end
