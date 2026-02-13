class Comment < ApplicationRecord
  belongs_to :document
  belongs_to :user, optional: true
  belongs_to :parent, class_name: "Comment", optional: true
  has_many :replies, class_name: "Comment", foreign_key: :parent_id, dependent: :destroy

  validates :body, presence: true
  validates :guest_name, presence: true, unless: :user_id?
  validates :page_number, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true

  scope :active, -> { where(resolved: false) }
  scope :resolved, -> { where(resolved: true) }
  scope :top_level, -> { where(parent_id: nil) }

  # Display name: user's name if logged in, guest_name if anonymous
  def author_name
    user&.name || guest_name || "Anonymous"
  end

  # Can this comment be edited/deleted by the given user?
  def editable_by?(user)
    user.present? && self.user == user
  end

  # Can this comment be resolved by the given user? (only the document owner)
  def resolvable_by?(user)
    user.present? && document.user == user
  end
end
