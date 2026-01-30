# frozen_string_literal: true

require "test_helper"

class FoldersControllerTest < ActionDispatch::IntegrationTest
  def setup
    setup_test_notes_dir
  end

  def teardown
    teardown_test_notes_dir
  end

  # === create ===

  test "create makes new folder" do
    post create_folder_url(path: "new_folder"), as: :json
    assert_response :created

    assert @test_notes_dir.join("new_folder").directory?
  end

  test "create makes nested folder" do
    post create_folder_url(path: "parent/child"), as: :json
    assert_response :created

    assert @test_notes_dir.join("parent/child").directory?
  end

  test "create returns error if folder exists" do
    create_test_folder("existing")

    post create_folder_url(path: "existing"), as: :json
    assert_response :unprocessable_entity
  end

  # === destroy ===

  test "destroy removes empty folder" do
    create_test_folder("empty_folder")

    delete destroy_folder_url(path: "empty_folder"), as: :json
    assert_response :success

    refute @test_notes_dir.join("empty_folder").exist?
  end

  test "destroy returns error for non-empty folder" do
    create_test_folder("folder")
    create_test_note("folder/note.md")

    delete destroy_folder_url(path: "folder"), as: :json
    assert_response :unprocessable_entity

    # Folder should still exist
    assert @test_notes_dir.join("folder").exist?
  end

  test "destroy returns 404 for missing folder" do
    delete destroy_folder_url(path: "nonexistent"), as: :json
    assert_response :not_found
  end

  # === rename ===

  test "rename moves folder" do
    create_test_folder("old_name")
    create_test_note("old_name/note.md", "Content")

    post rename_folder_url(path: "old_name"), params: { new_path: "new_name" }, as: :json
    assert_response :success

    refute @test_notes_dir.join("old_name").exist?
    assert @test_notes_dir.join("new_name").directory?
    assert @test_notes_dir.join("new_name/note.md").exist?
  end

  test "rename moves folder to different parent" do
    create_test_folder("source")
    create_test_folder("target")
    create_test_note("source/note.md")

    post rename_folder_url(path: "source"), params: { new_path: "target/source" }, as: :json
    assert_response :success

    refute @test_notes_dir.join("source").exist?
    assert @test_notes_dir.join("target/source").directory?
    assert @test_notes_dir.join("target/source/note.md").exist?
  end

  test "rename returns 404 for missing folder" do
    post rename_folder_url(path: "nonexistent"), params: { new_path: "new" }, as: :json
    assert_response :not_found
  end
end
