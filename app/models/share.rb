class Share < ApplicationRecord
  belongs_to :document
  belongs_to :user

  has_secure_token :token

  validates :document_id, uniqueness: { message: "already has a share link" }

  # Default expiry: 30 days from creation. nil = never expires.
  DEFAULT_EXPIRY = 30.days

  def expired?
    expires_at.present? && expires_at.past?
  end

  def active?
    !expired?
  end
end
