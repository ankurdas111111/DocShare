class CreateComments < ActiveRecord::Migration[8.1]
  def change
    create_table :comments do |t|
      t.text :body
      t.references :document, null: false, foreign_key: true
      t.references :user, null: true, foreign_key: true
      t.string :guest_name

      t.timestamps
    end
  end
end
