Rails.application.routes.draw do
  devise_for :users

  resources :documents, only: [ :new, :create, :show ] do
    resource :share, only: [ :create ]
  end

  # Public access to shared documents (anonymous users)
  get "shared/:token", to: "shared_documents#show", as: :shared_document

  # Authenticated users land on the dashboard
  root "dashboard#index"

  # Health check for load balancers and uptime monitors
  get "up" => "rails/health#show", as: :rails_health_check
end
