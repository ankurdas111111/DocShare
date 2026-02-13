class CommentsController < ApplicationController
  before_action :set_document

  def create
    @comment = @document.comments.build(comment_params)
    @comment.user = current_user

    if @comment.save
      redirect_to document_path(@document), notice: "Comment added."
    else
      redirect_to document_path(@document), alert: @comment.errors.full_messages.join(", ")
    end
  end

  private

  def set_document
    @document = current_user.documents.find(params[:document_id])
  end

  def comment_params
    params.require(:comment).permit(:body, :page_number)
  end
end
