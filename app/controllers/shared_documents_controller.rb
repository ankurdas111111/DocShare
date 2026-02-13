class SharedDocumentsController < ApplicationController
  skip_before_action :authenticate_user!

  before_action :set_shared_document

  def show
  end

  def add_comment
    @comment = @document.comments.build(comment_params)
    @comment.user = current_user if user_signed_in?

    if @comment.save
      redirect_to shared_document_path(@share.token), notice: "Comment added."
    else
      redirect_to shared_document_path(@share.token), alert: @comment.errors.full_messages.join(", ")
    end
  end

  private

  def set_shared_document
    @share = Share.find_by!(token: params[:token])
    @document = Document.includes(comments: :user).find(@share.document_id)
  end

  def comment_params
    params.require(:comment).permit(:body, :page_number, :guest_name, :parent_id)
  end
end
