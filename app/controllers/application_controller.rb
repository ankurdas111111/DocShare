class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Changes to the importmap will invalidate the etag for HTML responses
  stale_when_importmap_changes

  # Require login for all pages by default.
  # Controllers that allow public access (e.g. shared documents) will skip this.
  before_action :authenticate_user!
end
