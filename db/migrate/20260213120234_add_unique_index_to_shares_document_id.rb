class AddUniqueIndexToSharesDocumentId < ActiveRecord::Migration[8.1]
  def change
    remove_index :shares, :document_id
    add_index :shares, :document_id, unique: true
  end
end
