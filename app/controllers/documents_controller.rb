class DocumentsController < ApplicationController
  before_action :set_document, only: [ :show, :destroy ]
  before_action :authorize_owner!, only: [ :show, :destroy ]

  def new
    @document = Document.new
  end

  def show
    @active_comments = @document.comments.top_level.active.order(created_at: :desc)
    @resolved_comments = @document.comments.top_level.resolved.order(created_at: :desc)
  end

  def destroy
    @document.destroy
    redirect_to root_path, notice: "Document deleted."
  end

  def create
    @document = current_user.documents.build(document_params)

    # Pass the raw upload IO so the model can verify PDF magic bytes
    # before Active Storage persists the blob.
    uploaded_file = params.dig(:document, :file)
    @document.upload_io = uploaded_file.tempfile if uploaded_file.respond_to?(:tempfile)

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
    @document = Document.includes(:user, comments: [ :user, { replies: :user } ]).find(params[:id])
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
