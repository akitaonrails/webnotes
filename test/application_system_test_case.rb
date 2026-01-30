# frozen_string_literal: true

require "test_helper"
require "capybara/rails"
require "capybara/minitest"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  # Disable parallelization for system tests to avoid race conditions
  parallelize(workers: 1)

  driven_by :selenium, using: :headless_chrome, screen_size: [ 1400, 900 ]

  # Increase default wait time for slower CI environments
  Capybara.default_max_wait_time = 5

  def setup
    setup_test_notes_dir
  end

  def teardown
    teardown_test_notes_dir
  end
end
