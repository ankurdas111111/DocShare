class AddNotNullConstraints < ActiveRecord::Migration[8.1]
  def change
    change_column_null :documents, :title, false
    change_column_null :shares, :token, false
  end
end
