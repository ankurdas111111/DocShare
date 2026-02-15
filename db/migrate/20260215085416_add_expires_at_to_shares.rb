class AddExpiresAtToShares < ActiveRecord::Migration[8.1]
  def change
    add_column :shares, :expires_at, :datetime
  end
end
