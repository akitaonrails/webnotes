Rails.application.routes.draw do
  root "notes#index"

  # Notes API
  get "notes/tree", to: "notes#tree"
  get "notes/search", to: "notes#search"
  post "notes/*path/rename", to: "notes#rename", as: :rename_note
  get "notes/*path", to: "notes#show", as: :note
  post "notes/*path", to: "notes#create", as: :create_note
  patch "notes/*path", to: "notes#update", as: :update_note
  delete "notes/*path", to: "notes#destroy", as: :destroy_note

  # Folders API
  post "folders/*path/rename", to: "folders#rename", as: :rename_folder
  post "folders/*path", to: "folders#create", as: :create_folder
  delete "folders/*path", to: "folders#destroy", as: :destroy_folder

  # Images API
  get "images/config", to: "images#config"
  get "images", to: "images#index"
  get "images/preview/*path", to: "images#preview", as: :image_preview, format: false
  post "images/upload", to: "images#upload"
  post "images/upload_to_s3", to: "images#upload_to_s3"
  post "images/upload_external_to_s3", to: "images#upload_external_to_s3"
  post "images/upload_base64", to: "images#upload_base64"
  get "images/search_web", to: "images#search_web"
  get "images/search_google", to: "images#search_google"
  get "images/search_pinterest", to: "images#search_pinterest"

  # YouTube API
  get "youtube/config", to: "youtube#config"
  get "youtube/search", to: "youtube#search"

  # AI endpoints
  get "ai/config", to: "ai#config"
  post "ai/fix_grammar", to: "ai#fix_grammar"
  get "ai/image_config", to: "ai#image_config"
  post "ai/generate_image", to: "ai#generate_image"

  # Config API
  get "config", to: "config#show"
  patch "config", to: "config#update"

  # Translations API (for JavaScript i18n)
  get "translations", to: "translations#show"

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
