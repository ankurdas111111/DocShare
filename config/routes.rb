Rails.application.routes.draw do
  devise_for :users

  resources :documents, only: [ :new, :create, :show, :destroy ] do
    resource :share, only: [ :create, :destroy ]
    resources :comments, only: [ :create, :edit, :update, :destroy ] do
      patch :toggle_resolved, on: :member
    end
  end

  # Public access to shared documents (anonymous users)
  get    "shared/:token",                    to: "shared_documents#show",            as: :shared_document
  post   "shared/:token/comments",           to: "shared_documents#add_comment",     as: :shared_document_comments
  get    "shared/:token/comments/:id/edit",  to: "shared_documents#edit_comment",    as: :edit_shared_document_comment
  patch  "shared/:token/comments/:id",       to: "shared_documents#update_comment",  as: :shared_document_comment
  delete "shared/:token/comments/:id",       to: "shared_documents#destroy_comment"

  # Authenticated users land on the dashboard
  root "dashboard#index"

  # Health check for load balancers and uptime monitors
  get "up" => "rails/health#show", as: :rails_health_check
end
