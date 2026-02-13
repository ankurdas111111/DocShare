class Document < ApplicationRecord
  belongs_to :user

  has_one_attached :file

  validates :title, presence: true
  validates :file, presence: true
  validate :file_must_be_pdf
  validate :file_must_be_under_size_limit

  MAX_FILE_SIZE = 10 #in_mb

  private

  def file_must_be_pdf
    return unless file.attached?

    unless file.content_type == "application/pdf"
      errors.add(:file, "must be a PDF")
    end
  end

  def file_must_be_under_size_limit
    return unless file.attached?

    if file.byte_size > MAX_FILE_SIZE.megabytes
      errors.add(:file, "must be less than #{MAX_FILE_SIZE}MB")
    end
  end
end
