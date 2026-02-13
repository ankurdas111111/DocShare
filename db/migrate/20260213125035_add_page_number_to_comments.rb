class AddPageNumberToComments < ActiveRecord::Migration[8.1]
  def change
    add_column :comments, :page_number, :integer
  end
end
