Rails.application.routes.draw do
  devise_for :users

  resources :documents, only: [ :new, :create ]

  # Authenticated users land on the dashboard
  root "dashboard#index"

  # Health check for load balancers and uptime monitors
  get "up" => "rails/health#show", as: :rails_health_check
end
