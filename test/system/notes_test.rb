# frozen_string_literal: true

require "application_system_test_case"

class NotesTest < ApplicationSystemTestCase
  test "visiting the home page shows the app" do
    visit root_url

    assert_selector "header", text: "WebNotes"
    assert_selector "[data-app-target='fileTree']"
  end

  test "empty state shows placeholder message" do
    visit root_url

    assert_selector "[data-app-target='editorPlaceholder']", text: "Select a note to edit"
  end

  test "existing notes appear in the file tree" do
    create_test_note("my_note.md", "# My Note")

    visit root_url

    within "[data-app-target='fileTree']" do
      assert_text "my_note"
    end
  end

  test "clicking a note opens it in the editor" do
    create_test_note("test.md", "# Test Content\n\nHello world")

    visit root_url
    find("[data-path='test.md']").click

    assert_selector "[data-app-target='currentPath']", text: "test"
    assert_selector "textarea", visible: true
  end

  test "creating a new note via dialog" do
    visit root_url

    # Wait for page to fully load
    assert_selector "[data-app-target='fileTree']"

    # Click the new note button
    find("button[title='New Note (Ctrl+N)']").click

    # Wait for dialog to open
    assert_selector "dialog[open]", wait: 2

    # Fill in the dialog
    within "dialog[open]" do
      fill_in placeholder: "Note name", with: "brand_new_note"
      click_button "Create"
    end

    # Wait for dialog to close and note to be created
    assert_no_selector "dialog[open]", wait: 2

    # Note should appear in tree
    assert_selector "[data-path='brand_new_note.md']", wait: 3
    assert @test_notes_dir.join("brand_new_note.md").exist?
  end

  test "creating a new folder via dialog" do
    visit root_url

    # Wait for page to fully load
    assert_selector "[data-app-target='fileTree']"

    # Click the new folder button
    find("button[title='New Folder']").click

    # Wait for dialog to open
    assert_selector "dialog[open]", wait: 2

    # Fill in the dialog
    within "dialog[open]" do
      fill_in placeholder: "Folder name", with: "new_folder"
      click_button "Create"
    end

    # Wait for dialog to close
    assert_no_selector "dialog[open]", wait: 2

    # Folder should appear in tree
    assert_selector "[data-path='new_folder']", wait: 3
    assert @test_notes_dir.join("new_folder").directory?
  end

  test "editing a note updates the textarea" do
    create_test_note("editable.md", "Original content")

    visit root_url
    find("[data-path='editable.md']").click

    # Verify note content is loaded
    textarea = find("textarea")
    assert_equal "Original content", textarea.value
  end

  test "toggle preview panel" do
    create_test_note("preview_test.md", "# Preview Test\n\nSome **bold** text")

    visit root_url
    find("[data-path='preview_test.md']").click

    # Preview panel should not be visible initially
    preview_panel = find("[data-app-target='previewPanel']", visible: :all)
    assert preview_panel[:class].include?("hidden"), "Preview panel should be hidden initially"

    # Click toggle preview button
    find("button[title='Toggle Preview (Ctrl+Shift+P)']").click

    # Preview panel should be visible now
    sleep 0.2 # Wait for class toggle
    refute preview_panel[:class].include?("hidden"), "Preview panel should be visible after toggle"

    # Check rendered markdown
    within "[data-app-target='previewContent']" do
      assert_selector "h1", text: "Preview Test"
      assert_selector "strong", text: "bold"
    end
  end

  test "folders can be expanded and collapsed" do
    create_test_folder("my_folder")
    create_test_note("my_folder/nested_note.md")

    visit root_url

    # Folder should be visible
    assert_selector "[data-path='my_folder']"

    # Click to expand
    find("[data-path='my_folder'][data-type='folder']").click

    # Nested note should now be visible
    assert_selector "[data-path='my_folder/nested_note.md']", visible: true

    # Click again to collapse
    find("[data-path='my_folder'][data-type='folder']").click

    # Nested note should be hidden again
    assert_no_selector "[data-path='my_folder/nested_note.md']", visible: true
  end

  test "theme toggle switches dark mode" do
    visit root_url

    # Get initial state
    initial_dark = page.has_css?("html.dark")

    # Click theme toggle
    find("button[title='Toggle Theme']").click

    # Wait for class change
    sleep 0.1

    # Class should have toggled
    if initial_dark
      assert_no_selector "html.dark"
    else
      assert_selector "html.dark"
    end
  end

  test "context menu appears on right-click" do
    create_test_note("context_test.md")

    visit root_url

    # Right-click on the note
    find("[data-path='context_test.md']").right_click

    # Context menu should appear
    assert_selector "[data-app-target='contextMenu']:not(.hidden)"
    within "[data-app-target='contextMenu']" do
      assert_text "Rename"
      assert_text "Delete"
    end
  end

  test "renaming a note via context menu" do
    create_test_note("old_name.md", "Content")

    visit root_url

    # Right-click and rename
    find("[data-path='old_name.md']").right_click
    within "[data-app-target='contextMenu']" do
      click_button "Rename"
    end

    # Wait for rename dialog
    assert_selector "dialog[open]"

    within "dialog[open]" do
      fill_in with: "new_name"
      click_button "Rename"
    end

    # Wait for dialog to close
    assert_no_selector "dialog[open]"

    # Verify file was renamed
    assert_selector "[data-path='new_name.md']", wait: 3
    assert @test_notes_dir.join("new_name.md").exist?
    refute @test_notes_dir.join("old_name.md").exist?
  end

  test "deleting a note via context menu" do
    create_test_note("to_delete.md")

    visit root_url

    # Right-click and delete
    find("[data-path='to_delete.md']").right_click

    # Accept the confirmation
    accept_confirm do
      within "[data-app-target='contextMenu']" do
        click_button "Delete"
      end
    end

    # Note should be gone
    assert_no_selector "[data-path='to_delete.md']", wait: 3
    refute @test_notes_dir.join("to_delete.md").exist?
  end
end
