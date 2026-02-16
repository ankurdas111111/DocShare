class ShareMailer < ApplicationMailer
  def invite(share, recipient_email)
    @share = share
    @document = share.document
    @sender = share.user
    @url = shared_document_url(@share.token)

    mail(to: recipient_email, subject: "#{@sender.name} shared a PDF with you on DocShare")
  end
end
