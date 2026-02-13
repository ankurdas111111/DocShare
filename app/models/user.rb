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
end
