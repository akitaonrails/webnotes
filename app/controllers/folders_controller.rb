# frozen_string_literal: true

class FoldersController < ApplicationController
  before_action :set_service

  def create
    path = params[:path].to_s

    if @service.exists?(path)
      render json: { error: "Folder already exists" }, status: :unprocessable_entity
      return
    end

    @service.create_folder(path)
    render json: { path: path, message: "Folder created" }, status: :created
  rescue NotesService::InvalidPathError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def destroy
    path = params[:path].to_s
    @service.delete_folder(path)
    render json: { message: "Folder deleted" }
  rescue NotesService::NotFoundError
    render json: { error: "Folder not found" }, status: :not_found
  rescue NotesService::InvalidPathError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def rename
    old_path = params[:path].to_s
    new_path = params[:new_path].to_s

    @service.rename(old_path, new_path)
    render json: { old_path: old_path, new_path: new_path, message: "Folder renamed" }
  rescue NotesService::NotFoundError
    render json: { error: "Folder not found" }, status: :not_found
  rescue NotesService::InvalidPathError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  private

  def set_service
    @service = NotesService.new
  end
end
