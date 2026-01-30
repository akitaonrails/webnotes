# frozen_string_literal: true

class NotesService
  class NotFoundError < StandardError; end
  class InvalidPathError < StandardError; end

  def initialize(base_path: nil)
    @base_path = Pathname.new(base_path || ENV.fetch("NOTES_PATH", Rails.root.join("notes")))
    FileUtils.mkdir_p(@base_path) unless @base_path.exist?
  end

  def list_tree
    build_tree(@base_path)
  end

  def read(path)
    full_path = safe_path(path)
    raise NotFoundError, "Note not found: #{path}" unless full_path.file?

    full_path.read
  end

  def write(path, content)
    full_path = safe_path(path, must_exist: false)
    FileUtils.mkdir_p(full_path.dirname)
    full_path.write(content)
    true
  end

  def delete(path)
    full_path = safe_path(path)
    raise NotFoundError, "Note not found: #{path}" unless full_path.file?

    full_path.delete
    true
  end

  def rename(old_path, new_path)
    old_full = safe_path(old_path)
    new_full = safe_path(new_path, must_exist: false)

    raise NotFoundError, "Note not found: #{old_path}" unless old_full.exist?

    FileUtils.mkdir_p(new_full.dirname)
    FileUtils.mv(old_full, new_full)
    true
  end

  def create_folder(path)
    full_path = safe_path(path, must_exist: false)
    FileUtils.mkdir_p(full_path)
    true
  end

  def delete_folder(path)
    full_path = safe_path(path)
    raise NotFoundError, "Folder not found: #{path}" unless full_path.directory?

    if full_path.children.any?
      raise InvalidPathError, "Folder not empty: #{path}"
    end

    full_path.rmdir
    true
  end

  def exists?(path)
    full_path = safe_path(path, must_exist: false)
    full_path.exist?
  end

  def file?(path)
    full_path = safe_path(path, must_exist: false)
    full_path.file?
  end

  def directory?(path)
    full_path = safe_path(path, must_exist: false)
    full_path.directory?
  end

  private

  def safe_path(path, must_exist: true)
    normalized = Pathname.new(path.to_s.gsub(/\.\./, "")).cleanpath
    full_path = @base_path.join(normalized)

    unless full_path.to_s.start_with?(@base_path.to_s)
      raise InvalidPathError, "Invalid path: #{path}"
    end

    if must_exist && !full_path.exist?
      raise NotFoundError, "Path not found: #{path}"
    end

    full_path
  end

  def build_tree(dir, relative_base = @base_path)
    entries = dir.children.sort_by { |p| [p.directory? ? 0 : 1, p.basename.to_s.downcase] }

    entries.filter_map do |entry|
      next if entry.basename.to_s.start_with?(".")

      relative_path = entry.relative_path_from(relative_base).to_s

      if entry.directory?
        {
          name: entry.basename.to_s,
          path: relative_path,
          type: "folder",
          children: build_tree(entry, relative_base)
        }
      elsif entry.extname == ".md"
        {
          name: entry.basename(".md").to_s,
          path: relative_path,
          type: "file"
        }
      end
    end
  end
end
