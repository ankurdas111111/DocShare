class ApplicationController < ActionController::Base
  include Pagy::Method

  # Changes to the importmap will invalidate the etag for HTML responses
  stale_when_importmap_changes

  # Require login for all pages by default.
  # Controllers that allow public access (e.g. shared documents) will skip this.
  before_action :authenticate_user!

  # Allow Devise to accept the name parameter during signup and account update.
  before_action :configure_permitted_parameters, if: :devise_controller?

  private

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [ :name ])
    devise_parameter_sanitizer.permit(:account_update, keys: [ :name ])
  end
end
