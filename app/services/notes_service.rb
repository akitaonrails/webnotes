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

  # Search file contents for a pattern (text or regex)
  # Returns an array of matches with context
  def search_content(query, context_lines: 3, max_results: 50)
    return [] if query.blank?

    # Try to compile as regex, fall back to escaped literal
    regex = begin
      Regexp.new(query, Regexp::IGNORECASE)
    rescue RegexpError
      Regexp.new(Regexp.escape(query), Regexp::IGNORECASE)
    end

    results = []
    all_files = collect_markdown_files(@base_path)

    all_files.each do |file_path|
      break if results.size >= max_results

      relative_path = file_path.relative_path_from(@base_path).to_s
      file_matches = search_file(file_path, regex, context_lines, max_results - results.size)

      file_matches.each do |match|
        results << match.merge(path: relative_path, name: file_path.basename(".md").to_s)
      end
    end

    results
  end

  private

  def collect_markdown_files(dir)
    files = []
    return files unless dir.directory?

    dir.children.sort_by { |p| p.basename.to_s.downcase }.each do |entry|
      next if entry.basename.to_s.start_with?(".")

      if entry.directory?
        files.concat(collect_markdown_files(entry))
      elsif entry.extname == ".md"
        files << entry
      end
    end

    files
  end

  def search_file(file_path, regex, context_lines, max_matches)
    matches = []
    lines = file_path.readlines(chomp: true)

    lines.each_with_index do |line, index|
      next unless line.match?(regex)
      break if matches.size >= max_matches

      # Calculate context range
      start_line = [0, index - context_lines].max
      end_line = [lines.size - 1, index + context_lines].min

      # Extract context with line numbers
      context = (start_line..end_line).map do |i|
        { line_number: i + 1, content: lines[i], is_match: i == index }
      end

      matches << {
        line_number: index + 1,
        match_text: line,
        context: context
      }
    end

    matches
  end

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
