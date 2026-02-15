class SharedDocumentsController < ApplicationController
  skip_before_action :authenticate_user!

  before_action :set_shared_document

  def show
    @active_comments = @document.comments.top_level.active.order(created_at: :desc)
    @resolved_comments = @document.comments.top_level.resolved.order(created_at: :desc)
  end

  def add_comment
    @comment = @document.comments.build(comment_params)
    @comment.user = current_user if user_signed_in?

    # Validate parent belongs to the same document
    if @comment.parent_id.present? && !@document.comments.exists?(id: @comment.parent_id)
      redirect_to shared_document_path(@share.token), alert: "Invalid parent comment."
      return
    end

    if @comment.save
      redirect_to shared_document_path(@share.token), notice: "Comment added."
    else
      redirect_to shared_document_path(@share.token), alert: @comment.errors.full_messages.join(", ")
    end
  end

  private

  def set_shared_document
    @share = Share.find_by!(token: params[:token])
    @document = Document.includes(comments: [:user, { replies: :user }]).find(@share.document_id)
  end

  def comment_params
    params.require(:comment).permit(:body, :page_number, :guest_name, :parent_id)
  end
end
