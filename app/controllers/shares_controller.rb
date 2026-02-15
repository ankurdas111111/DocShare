class SharesController < ApplicationController
  before_action :set_document

  def create
    # Return existing share, or create one with default expiry.
    # Rescue handles the race condition where two concurrent requests
    # both see no share and try to INSERT — the unique index on document_id
    # causes the second INSERT to raise RecordNotUnique.
    @share = @document.share || @document.create_share(
      user: current_user,
      expires_at: Share::DEFAULT_EXPIRY.from_now
    )

    redirect_to @document, notice: "Share link generated!"
  rescue ActiveRecord::RecordNotUnique
    @share = @document.share.reload
    redirect_to @document, notice: "Share link generated!"
  end

  def destroy
    @document.share&.destroy
    redirect_to @document, notice: "Share link revoked."
  end

  private

  def set_document
    @document = current_user.documents.find(params[:document_id])
  end
end
