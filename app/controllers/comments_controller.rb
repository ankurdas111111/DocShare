class CommentsController < ApplicationController
  before_action :set_document
  before_action :set_comment, only: [ :edit, :update, :destroy, :toggle_resolved ]
  before_action :authorize_author!, only: [ :edit, :update, :destroy ]
  before_action :authorize_owner!, only: [ :toggle_resolved ]

  def create
    @comment = @document.comments.build(comment_params)
    @comment.user = current_user

    # Validate parent belongs to the same document (prevent IDOR)
    if @comment.parent_id.present? && !@document.comments.exists?(id: @comment.parent_id)
      redirect_to document_path(@document), alert: "Invalid parent comment."
      return
    end

    if @comment.save
      redirect_to document_path(@document), notice: "Comment added."
    else
      redirect_to document_path(@document), alert: @comment.errors.full_messages.join(", ")
    end
  end

  def edit
  end

  def update
    if @comment.update(comment_params)
      redirect_to document_path(@document), notice: "Comment updated."
    else
      redirect_to document_path(@document), alert: @comment.errors.full_messages.join(", ")
    end
  end

  def destroy
    @comment.destroy
    redirect_to document_path(@document), notice: "Comment deleted."
  end

  def toggle_resolved
    @comment.update!(resolved: !@comment.resolved)
    status = @comment.resolved? ? "resolved" : "reopened"
    redirect_to document_path(@document), notice: "Comment #{status}."
  end

  private

  def set_document
    @document = current_user.documents.find(params[:document_id])
  end

  def set_comment
    @comment = @document.comments.find(params[:id])
  end

  def authorize_author!
    unless @comment.editable_by?(current_user)
      redirect_to document_path(@document), alert: "Not authorized."
    end
  end

  def authorize_owner!
    unless @comment.resolvable_by?(current_user)
      redirect_to document_path(@document), alert: "Not authorized."
    end
  end

  def comment_params
    params.require(:comment).permit(:body, :page_number, :parent_id)
  end
end
