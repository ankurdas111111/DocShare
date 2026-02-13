class Share < ApplicationRecord
  belongs_to :document
  belongs_to :user

  has_secure_token :token

  validates :document_id, uniqueness: { message: "already has a share link" }
end
