class AddResolvedToComments < ActiveRecord::Migration[8.1]
  def change
    add_column :comments, :resolved, :boolean, default: false, null: false
  end
end
