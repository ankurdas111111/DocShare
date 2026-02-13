class SharedDocumentsController < ApplicationController
  skip_before_action :authenticate_user!

  def show
    @share = Share.find_by!(token: params[:token])
    @document = @share.document
  end
end
