# frozen_string_literal: true

require "test_helper"

class NotesControllerTest < ActionDispatch::IntegrationTest
  def setup
    setup_test_notes_dir
  end

  def teardown
    teardown_test_notes_dir
  end

  # === index ===

  test "index renders the main page" do
    get root_url
    assert_response :success
    assert_select "div[data-controller='app']"
  end

  test "index includes tree data" do
    create_test_note("test.md")

    get root_url
    assert_response :success
    assert_match "test", response.body
  end

  # === tree ===

  test "tree returns JSON file tree" do
    create_test_note("note1.md")
    create_test_folder("folder1")
    create_test_note("folder1/note2.md")

    get notes_tree_url, as: :json
    assert_response :success

    tree = JSON.parse(response.body)
    assert_equal 2, tree.length

    folder = tree.find { |item| item["type"] == "folder" }
    assert_equal "folder1", folder["name"]
    assert_equal 1, folder["children"].length
  end

  # === show ===

  test "show returns note content" do
    create_test_note("test.md", "# Hello\n\nWorld")

    get note_url(path: "test.md"), as: :json
    assert_response :success

    data = JSON.parse(response.body)
    assert_equal "test.md", data["path"]
    assert_equal "# Hello\n\nWorld", data["content"]
  end

  test "show returns 404 for missing note" do
    get note_url(path: "nonexistent.md"), as: :json
    assert_response :not_found
  end

  # === create ===

  test "create makes new note" do
    post create_note_url(path: "new_note"), params: { content: "# New Note" }, as: :json
    assert_response :created

    assert @test_notes_dir.join("new_note.md").exist?
    assert_equal "# New Note", File.read(@test_notes_dir.join("new_note.md"))
  end

  test "create adds .md extension if missing" do
    post create_note_url(path: "no_extension"), params: { content: "Content" }, as: :json
    assert_response :created

    assert @test_notes_dir.join("no_extension.md").exist?
  end

  test "create in subfolder works" do
    create_test_folder("subfolder")

    post create_note_url(path: "subfolder/nested.md"), params: { content: "Nested" }, as: :json
    assert_response :created

    assert @test_notes_dir.join("subfolder/nested.md").exist?
  end

  test "create returns error if note exists" do
    create_test_note("existing.md")

    post create_note_url(path: "existing.md"), params: { content: "Content" }, as: :json
    assert_response :unprocessable_entity
  end

  # === update ===

  test "update saves note content" do
    create_test_note("test.md", "Old content")

    patch update_note_url(path: "test.md"), params: { content: "New content" }, as: :json
    assert_response :success

    assert_equal "New content", File.read(@test_notes_dir.join("test.md"))
  end

  test "update creates note if it does not exist" do
    patch update_note_url(path: "new.md"), params: { content: "Content" }, as: :json
    assert_response :success

    assert @test_notes_dir.join("new.md").exist?
  end

  # === destroy ===

  test "destroy removes note" do
    create_test_note("to_delete.md")

    delete destroy_note_url(path: "to_delete.md"), as: :json
    assert_response :success

    refute @test_notes_dir.join("to_delete.md").exist?
  end

  test "destroy returns 404 for missing note" do
    delete destroy_note_url(path: "nonexistent.md"), as: :json
    assert_response :not_found
  end

  # === rename ===

  test "rename moves note to new path" do
    create_test_note("old.md", "Content")

    post rename_note_url(path: "old.md"), params: { new_path: "new.md" }, as: :json
    assert_response :success

    refute @test_notes_dir.join("old.md").exist?
    assert @test_notes_dir.join("new.md").exist?
  end

  test "rename moves note to subfolder" do
    create_test_note("root.md", "Content")
    create_test_folder("subfolder")

    post rename_note_url(path: "root.md"), params: { new_path: "subfolder/moved.md" }, as: :json
    assert_response :success

    refute @test_notes_dir.join("root.md").exist?
    assert @test_notes_dir.join("subfolder/moved.md").exist?
  end

  test "rename returns 404 for missing note" do
    post rename_note_url(path: "nonexistent.md"), params: { new_path: "new.md" }, as: :json
    assert_response :not_found
  end

  # === search ===

  test "search returns matching results" do
    create_test_note("test.md", "Hello world\nThis is searchable content")

    get "/notes/search", params: { q: "searchable" }, as: :json
    assert_response :success

    results = JSON.parse(response.body)
    assert_equal 1, results.length
    assert_equal "test.md", results.first["path"]
  end

  test "search returns empty array for no matches" do
    create_test_note("test.md", "Hello world")

    get "/notes/search", params: { q: "nonexistent" }, as: :json
    assert_response :success

    results = JSON.parse(response.body)
    assert_equal [], results
  end

  test "search supports regex patterns" do
    create_test_note("test.md", "foo123bar")

    get "/notes/search", params: { q: "foo\\d+bar" }, as: :json
    assert_response :success

    results = JSON.parse(response.body)
    assert_equal 1, results.length
  end

  test "search returns context lines" do
    create_test_note("test.md", "line1\nline2\nmatch\nline4\nline5")

    get "/notes/search", params: { q: "match" }, as: :json
    assert_response :success

    results = JSON.parse(response.body)
    assert results.first["context"].is_a?(Array)
    assert results.first["context"].length > 1
  end
end
