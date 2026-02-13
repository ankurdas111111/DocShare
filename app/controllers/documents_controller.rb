class DocumentsController < ApplicationController
  before_action :set_document, only: [ :show ]
  before_action :authorize_owner!, only: [ :show ]

  def new
    @document = Document.new
  end

  def show
  end

  def create
    @document = current_user.documents.build(document_params)

    # Default title to original filename if not provided
    if @document.title.blank? && @document.file.attached?
      @document.title = @document.file.filename.base
    end

    if @document.save
      redirect_to @document, notice: "PDF uploaded successfully."
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  def set_document
    @document = Document.includes(comments: :user).find(params[:id])
  end

  def authorize_owner!
    unless @document.user == current_user
      redirect_to root_path, alert: "Not authorized."
    end
  end

  def document_params
    params.require(:document).permit(:title, :file)
  end
end
