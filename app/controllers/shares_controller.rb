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

    send_invite_email if params[:recipient_email].present?

    notice = "Share link generated!"
    notice += " Invitation sent to #{params[:recipient_email]}." if params[:recipient_email].present?
    redirect_to @document, notice: notice
  rescue ActiveRecord::RecordNotUnique
    @share = @document.share.reload

    send_invite_email if params[:recipient_email].present?

    notice = "Share link generated!"
    notice += " Invitation sent to #{params[:recipient_email]}." if params[:recipient_email].present?
    redirect_to @document, notice: notice
  end

  def destroy
    @document.share&.destroy
    redirect_to @document, notice: "Share link revoked."
  end

  private

  def set_document
    @document = current_user.documents.find(params[:document_id])
  end

  def send_invite_email
    email = params[:recipient_email].to_s.strip
    return unless email.match?(URI::MailTo::EMAIL_REGEXP)

    ShareMailer.invite(@share, email).deliver_later
  end
end
