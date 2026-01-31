# frozen_string_literal: true

class FoldersController < ApplicationController
  before_action :set_folder, only: [ :destroy, :rename ]

  def create
    @folder = Folder.new(path: params[:path].to_s)

    if @folder.exists?
      render json: { error: t("errors.folder_already_exists") }, status: :unprocessable_entity
      return
    end

    if @folder.create
      render json: { path: @folder.path, message: t("success.folder_created") }, status: :created
    else
      render json: { error: @folder.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end

  def destroy
    if @folder.destroy
      render json: { message: t("success.folder_deleted") }
    else
      error_message = @folder.errors.full_messages.join(", ")
      status = error_message.include?("not found") ? :not_found : :unprocessable_entity
      render json: { error: error_message }, status: status
    end
  end

  def rename
    old_path = @folder.path
    new_path = params[:new_path].to_s

    if @folder.rename(new_path)
      render json: { old_path: old_path, new_path: @folder.path, message: t("success.folder_renamed") }
    else
      error_message = @folder.errors.full_messages.join(", ")
      status = error_message.include?("not found") ? :not_found : :unprocessable_entity
      render json: { error: error_message }, status: status
    end
  end

  private

  def set_folder
    @folder = Folder.new(path: params[:path].to_s)
  end
end
