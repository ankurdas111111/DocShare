class AddCompositeIndexToDocuments < ActiveRecord::Migration[8.1]
  def change
    add_index :documents, [ :user_id, :created_at ], name: "index_documents_on_user_id_and_created_at"
  end
end
