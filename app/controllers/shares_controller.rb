class SharesController < ApplicationController
  before_action :set_document

  def create
    # Return existing share, or create one.
    # Rescue handles the race condition where two concurrent requests
    # both see no share and try to INSERT — the unique index on document_id
    # causes the second INSERT to raise RecordNotUnique.
    @share = @document.share || @document.create_share(user: current_user)

    redirect_to @document, notice: "Share link generated!"
  rescue ActiveRecord::RecordNotUnique
    @share = @document.share.reload
    redirect_to @document, notice: "Share link generated!"
  end

  private

  def set_document
    @document = current_user.documents.find(params[:document_id])
  end
end
