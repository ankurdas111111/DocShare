class DocumentsController < ApplicationController
  def new
    @document = Document.new
  end

  def create
    @document = current_user.documents.build(document_params)

    # Default title to original filename if not provided
    if @document.title.blank? && @document.file.attached?
      @document.title = @document.file.filename.base
    end

    if @document.save
      redirect_to root_path, notice: "PDF uploaded successfully."
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  def document_params
    params.require(:document).permit(:title, :file)
  end
end
