# frozen_string_literal: true

class NotesController < ApplicationController
  before_action :set_service

  def index
    @tree = @service.list_tree
  end

  def tree
    render json: @service.list_tree
  end

  def show
    path = normalize_path(params[:path])
    content = @service.read(path)
    render json: { path: path, content: content }
  rescue NotesService::NotFoundError
    render json: { error: "Note not found" }, status: :not_found
  end

  def create
    path = normalize_path(params[:path])
    content = params[:content] || ""

    if @service.exists?(path)
      render json: { error: "Note already exists" }, status: :unprocessable_entity
      return
    end

    @service.write(path, content)
    render json: { path: path, message: "Note created" }, status: :created
  rescue NotesService::InvalidPathError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def update
    path = normalize_path(params[:path])
    content = params[:content] || ""

    @service.write(path, content)
    render json: { path: path, message: "Note saved" }
  rescue NotesService::InvalidPathError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def destroy
    path = normalize_path(params[:path])
    @service.delete(path)
    render json: { message: "Note deleted" }
  rescue NotesService::NotFoundError
    render json: { error: "Note not found" }, status: :not_found
  end

  def rename
    old_path = normalize_path(params[:path])
    new_path = normalize_path(params[:new_path])

    @service.rename(old_path, new_path)
    render json: { old_path: old_path, new_path: new_path, message: "Note renamed" }
  rescue NotesService::NotFoundError
    render json: { error: "Note not found" }, status: :not_found
  rescue NotesService::InvalidPathError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def search
    query = params[:q].to_s
    results = @service.search_content(query, context_lines: 3, max_results: 50)
    render json: results
  end

  private

  def set_service
    @service = NotesService.new
  end

  def normalize_path(path)
    return "" if path.blank?

    path = path.to_s
    path = "#{path}.md" unless path.end_with?(".md")
    path
  end
end
