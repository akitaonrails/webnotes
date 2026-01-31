# frozen_string_literal: true

class NotesController < ApplicationController
  before_action :set_note, only: [ :update, :destroy, :rename ]

  def index
    @tree = Note.all
    @initial_path = params[:file]
    @initial_note = load_initial_note if @initial_path.present?
    @config = load_config
  end

  def tree
    render json: Note.all
  end

  def show
    path = Note.normalize_path(params[:path])

    # JSON API request - check Accept header since .md extension confuses format detection
    if json_request?
      begin
        note = Note.find(path)
        render json: { path: note.path, content: note.content }
      rescue NotesService::NotFoundError
        render json: { error: t("errors.note_not_found") }, status: :not_found
      end
      return
    end

    # HTML request - render SPA with file loaded
    @tree = Note.all
    @initial_path = path
    @initial_note = load_initial_note
    @config = load_config
    render :index, formats: [ :html ]
  end

  def create
    path = Note.normalize_path(params[:path])
    @note = Note.new(path: path, content: params[:content] || "")

    if @note.exists?
      render json: { error: t("errors.note_already_exists") }, status: :unprocessable_entity
      return
    end

    if @note.save
      render json: { path: @note.path, message: t("success.note_created") }, status: :created
    else
      render json: { error: @note.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end

  def update
    @note.content = params[:content] || ""

    if @note.save
      render json: { path: @note.path, message: t("success.note_saved") }
    else
      render json: { error: @note.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end

  def destroy
    if @note.destroy
      render json: { message: t("success.note_deleted") }
    else
      render json: { error: @note.errors.full_messages.join(", ") }, status: :not_found
    end
  end

  def rename
    unless @note.exists?
      render json: { error: t("errors.note_not_found") }, status: :not_found
      return
    end

    new_path = Note.normalize_path(params[:new_path])
    old_path = @note.path

    if @note.rename(new_path)
      render json: { old_path: old_path, new_path: @note.path, message: t("success.note_renamed") }
    else
      render json: { error: @note.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end

  def search
    query = params[:q].to_s
    results = Note.search(query, context_lines: 3, max_results: 20)
    render json: results
  end

  private

  def json_request?
    # Check Accept header since .md extension in URL confuses Rails format detection
    request.headers["Accept"]&.include?("application/json") ||
      request.xhr? ||
      request.format.json?
  end

  def set_note
    path = Note.normalize_path(params[:path])
    @note = Note.new(path: path)
  end

  def load_initial_note
    return nil unless @initial_path.present?

    path = Note.normalize_path(@initial_path)
    note = Note.new(path: path)

    if note.exists?
      {
        path: note.path,
        content: note.read,
        exists: true
      }
    else
      {
        path: path,
        content: nil,
        exists: false,
        error: t("errors.file_not_found")
      }
    end
  rescue NotesService::NotFoundError
    {
      path: path,
      content: nil,
      exists: false,
      error: t("errors.file_not_found")
    }
  end

  def load_config
    config = Config.new
    {
      settings: config.ui_settings,
      features: {
        s3_upload: config.feature_available?(:s3_upload),
        youtube_search: config.feature_available?(:youtube_search),
        google_search: config.feature_available?(:google_search),
        local_images: config.feature_available?(:local_images)
      }
    }
  rescue => e
    Rails.logger.warn("Failed to load config: #{e.message}")
    { settings: {}, features: {} }
  end
end
