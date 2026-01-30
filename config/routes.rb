Rails.application.routes.draw do
  root "notes#index"

  # Notes API
  get "notes/tree", to: "notes#tree"
  post "notes/*path/rename", to: "notes#rename", as: :rename_note
  get "notes/*path", to: "notes#show", as: :note
  post "notes/*path", to: "notes#create", as: :create_note
  patch "notes/*path", to: "notes#update", as: :update_note
  delete "notes/*path", to: "notes#destroy", as: :destroy_note

  # Folders API
  post "folders/*path/rename", to: "folders#rename", as: :rename_folder
  post "folders/*path", to: "folders#create", as: :create_folder
  delete "folders/*path", to: "folders#destroy", as: :destroy_folder

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
