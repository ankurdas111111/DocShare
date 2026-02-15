class ApplicationMailer < ActionMailer::Base
  default from: ENV.fetch("MAILER_SENDER", "DocShare <onboarding@resend.dev>")
  layout "mailer"
end
