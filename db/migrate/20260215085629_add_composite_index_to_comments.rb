class AddCompositeIndexToComments < ActiveRecord::Migration[8.1]
  def change
    # Speeds up the sidebar query:
    # WHERE document_id = ? AND parent_id IS NULL AND resolved = false ORDER BY created_at DESC
    add_index :comments, [:document_id, :parent_id, :resolved, :created_at],
              name: "index_comments_on_doc_parent_resolved_created"
  end
end
