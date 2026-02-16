class Document < ApplicationRecord
  belongs_to :user

  has_one :share, dependent: :destroy
  has_many :comments, dependent: :destroy
  has_one_attached :file

  # Virtual attribute: holds the raw upload IO so validation can read magic bytes
  # before the blob is persisted to Active Storage's service.
  attr_accessor :upload_io

  scope :search_by_title, ->(query) {
    where("title ILIKE ?", "%#{sanitize_sql_like(query)}%") if query.present?
  }

  validates :title, presence: true, length: { maximum: 255 }
  validates :file, presence: true
  validate :file_must_be_pdf
  validate :file_must_be_under_size_limit

  MAX_FILE_SIZE = 10 # in megabytes

  private

  def file_must_be_pdf
    return unless file.attached?

    # Check client-provided content type
    unless file.content_type == "application/pdf"
      errors.add(:file, "must be a PDF")
      return
    end

    # Verify PDF magic bytes (%PDF-) to prevent content-type spoofing.
    # For new uploads: read from upload_io (set by the controller).
    # For persisted blobs: download from Active Storage.
    header = if upload_io.present?
                upload_io.rewind
                bytes = upload_io.read(5)
                upload_io.rewind
                bytes
    elsif !file.blob.new_record?
                file.blob.open { |tempfile| tempfile.read(5) }
    end

    if header.present? && header != "%PDF-"
      errors.add(:file, "does not appear to be a valid PDF")
    end
  rescue => e
    Rails.logger.error("PDF validation error: #{e.message}")
    errors.add(:file, "could not be validated")
  end

  def file_must_be_under_size_limit
    return unless file.attached?

    if file.byte_size > MAX_FILE_SIZE.megabytes
      errors.add(:file, "must be less than #{MAX_FILE_SIZE}MB")
    end
  end
end
