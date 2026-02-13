class DashboardController < ApplicationController
  def index
    @documents = current_user.documents
                             .search_by_title(params[:query])
                             .order(created_at: :desc)
  end
end
