ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"
require "fileutils"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Create a temporary notes directory for each test
    def setup_test_notes_dir
      @original_notes_path = ENV["NOTES_PATH"]
      @test_notes_dir = Rails.root.join("tmp", "test_notes_#{SecureRandom.hex(8)}")
      FileUtils.mkdir_p(@test_notes_dir)
      ENV["NOTES_PATH"] = @test_notes_dir.to_s
    end

    def teardown_test_notes_dir
      FileUtils.rm_rf(@test_notes_dir) if @test_notes_dir&.exist?
      ENV["NOTES_PATH"] = @original_notes_path
    end

    # Helper to create a test note
    def create_test_note(path, content = "# Test\n\nContent")
      full_path = @test_notes_dir.join(path)
      FileUtils.mkdir_p(full_path.dirname)
      File.write(full_path, content)
      full_path
    end

    # Helper to create a test folder
    def create_test_folder(path)
      full_path = @test_notes_dir.join(path)
      FileUtils.mkdir_p(full_path)
      full_path
    end
  end
end
