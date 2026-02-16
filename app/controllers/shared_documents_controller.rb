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

  def edit_comment
    @comment = @document.comments.find(params[:id])
    return unless authorize_shared_author!
  end

  def update_comment
    @comment = @document.comments.find(params[:id])
    return unless authorize_shared_author!

    if @comment.update(shared_comment_update_params)
      redirect_to shared_document_path(@share.token), notice: "Comment updated."
    else
      redirect_to shared_document_path(@share.token), alert: @comment.errors.full_messages.join(", ")
    end
  end

  def destroy_comment
    @comment = @document.comments.find(params[:id])
    return unless authorize_shared_author!

    @comment.destroy
    redirect_to shared_document_path(@share.token), notice: "Comment deleted."
  end

  private

  def set_shared_document
    @share = Share.find_by!(token: params[:token])

    if @share.expired?
      raise ActiveRecord::RecordNotFound, "Share link has expired"
    end

    @document = Document.includes(:user, comments: [:user, { replies: :user }]).find(@share.document_id)
  end

  def comment_params
    params.require(:comment).permit(:body, :page_number, :guest_name, :parent_id)
  end

  def shared_comment_update_params
    params.require(:comment).permit(:body, :page_number)
  end

  def authorize_shared_author!
    return true if user_signed_in? && @comment.editable_by?(current_user)

    redirect_to shared_document_path(@share.token), alert: "Not authorized."
    false
  end
end
