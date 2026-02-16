class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  # Order matters: shares must be destroyed before documents
  has_many :shares, dependent: :destroy
  has_many :comments, dependent: :nullify
  has_many :documents, dependent: :destroy

  validates :name, presence: true

  protected

  # Send Devise emails (password reset, etc.) asynchronously so a
  # delivery failure (e.g. Resend API error) never causes a 500 in
  # the request cycle.
  def send_devise_notification(notification, *args)
    devise_mailer.send(notification, self, *args).deliver_later
  end
end
