class CreateShares < ActiveRecord::Migration[8.1]
  def change
    create_table :shares do |t|
      t.string :token
      t.references :document, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
    add_index :shares, :token, unique: true
  end
end
