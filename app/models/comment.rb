class Comment < ApplicationRecord
  belongs_to :document
  belongs_to :user, optional: true

  validates :body, presence: true
  validates :guest_name, presence: true, unless: :user_id?
  validates :page_number, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true

  # Display name: user's name if logged in, guest_name if anonymous
  def author_name
    user&.name || guest_name || "Anonymous"
  end
end
