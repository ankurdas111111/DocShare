# DocShare

**PDF Management & Collaboration System** -- Upload, view, share, and comment on PDF documents.

Built with Ruby on Rails 8.1, PostgreSQL, PDF.js, and Stimulus.js.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment (Render)](#deployment-render)
- [Routes Summary](#routes-summary)
- [Screenshots](#screenshots)
- [Future Enhancements](#future-enhancements)
- [License](#license)

---

## Features

### Authentication
- Sign up, sign in, sign out, password reset, remember me
- Edit profile (name, email, password)
- Powered by [Devise](https://github.com/heartcombo/devise)

### PDF Upload & Validation
- Upload PDFs via Active Storage (local disk in dev, Cloudinary in production)
- Server-side magic-byte validation (`%PDF-` header check)
- 10 MB file size limit
- Title auto-defaults to the uploaded filename

### Dashboard
- View all your uploaded documents
- Search documents by title (ILIKE)
- Paginated list (20 per page, via [Pagy](https://github.com/ddnexus/pagy))

### PDF Viewer
- Renders PDFs in-browser using [PDF.js](https://mozilla.github.io/pdf.js/)
- Canvas-based rendering with a selectable text layer
- Retina/HiDPI display support
- Page tracking via IntersectionObserver (auto-detects current page)

### Sharing
- Generate a unique, token-based share link for any document
- Share links expire after 30 days (configurable)
- Revoke share links at any time
- Anonymous users can view shared PDFs without signing in

### Commenting
- Page-level sidebar comments with optional page number
- One-level threaded replies
- Resolve / unresolve comments (document owner only)
- Guest commenting on shared documents (name required)
- Edit and delete your own comments

### Rich-text Comment Editor
- Live rich-text editing via `contenteditable` (no Write/Preview toggle)
- Formatting toolbar: **Bold**, *Italic*, bullet lists
- Keyboard shortcuts: Cmd/Ctrl+B (bold), Cmd/Ctrl+I (italic)
- Content synced to Markdown for storage, rendered server-side via [Redcarpet](https://github.com/vmg/redcarpet)

### Quote from PDF
- Select text in the PDF viewer to see a "Quote & Comment" tooltip
- Clicking it auto-fills the comment form with the quoted text as a blockquote
- Quoted text renders with a distinct "QUOTED FROM PDF" label

### Security
- Rate limiting via [Rack::Attack](https://github.com/rack/rack-attack) (login, signup, comments, general)
- Content Security Policy (CSP) headers
- IDOR protection on comments (parent must be top-level)
- Access control: only document owners can delete, share, or resolve comments
- PDF magic-byte validation prevents non-PDF uploads

### Production-Ready
- Dockerized deployment (multi-stage `Dockerfile`)
- Cloudinary integration for cloud PDF storage
- Resend integration for transactional email
- Configured for Render deployment

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Ruby 3.4.2 / Rails 8.1.2 |
| Database | PostgreSQL 14 |
| Authentication | Devise |
| Pagination | Pagy ~> 43.2 |
| Markdown | Redcarpet |
| Rate Limiting | Rack::Attack ~> 6.8 |
| Frontend JS | Stimulus.js, Turbo (Hotwire) |
| PDF Rendering | PDF.js 4.8.69 (via CDN + importmap) |
| Asset Pipeline | Propshaft |
| Storage (prod) | Cloudinary |
| Email (prod) | Resend |
| Deployment | Docker / Render |

---

## Architecture

### Data Model

```
User
 |--- has_many :documents
 |--- has_many :comments
 |--- has_many :shares
 |
 Document
 |--- belongs_to :user
 |--- has_one_attached :file (Active Storage)
 |--- has_one :share
 |--- has_many :comments
 |
 Comment (self-referential)
 |--- belongs_to :document
 |--- belongs_to :user (optional -- guest comments)
 |--- belongs_to :parent (optional)
 |--- has_many :replies
 |
 Share
 |--- belongs_to :document (unique)
 |--- belongs_to :user
 |--- has_secure_token :token
 |--- expires_at (30 days default)
```

### Key Directories

```
app/
  controllers/       # Dashboard, Documents, Comments, Shares, SharedDocuments
  javascript/
    controllers/     # Stimulus: pdf_viewer_controller, markdown_toolbar_controller
  models/            # User, Document, Comment, Share
  views/
    comments/        # _comment, _form, _reply_form, _markdown_toolbar, edit
    dashboard/       # index (document list)
    documents/       # new (upload), show (viewer + comments)
    shared_documents/ # show (public shared view)
    shared/          # _navbar, _error_messages
  assets/
    stylesheets/     # application.css (single-file design system)
  helpers/           # render_markdown (Redcarpet + sanitize)
config/
  routes.rb
  storage.yml        # local + cloudinary backends
  initializers/
    rack_attack.rb   # Rate limiting rules
    content_security_policy.rb
```

---

## Getting Started

### Prerequisites

- Ruby 3.4.2 ([rbenv](https://github.com/rbenv/rbenv) or [asdf](https://asdf-vm.com/))
- PostgreSQL 14+ (or Docker)
- Bundler (`gem install bundler`)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/ankurdas111111/DocShare.git
cd DocShare

# 2. Install dependencies
bundle install

# 3. Start PostgreSQL (via Docker)
docker compose up -d

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your local values (defaults work with the Docker Postgres)

# 5. Create and migrate the database
bin/rails db:create db:migrate

# 6. Start the development server
bin/rails server

# 7. Visit the app
open http://localhost:3000
```

### Stopping the Database

```bash
docker compose down        # Stop Postgres container
docker compose down -v     # Stop and remove data volume
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_HOST` | Dev | Database host (default: `localhost`) |
| `DB_PORT` | Dev | Database port (default: `5433` for Docker) |
| `DB_USERNAME` | Dev | Database user (default: `postgres`) |
| `DB_PASSWORD` | Dev | Database password (default: `secret`) |
| `DATABASE_URL` | Prod | Full PostgreSQL connection string (provided by Render) |
| `RAILS_MASTER_KEY` | Prod | Contents of `config/master.key` |
| `SECRET_KEY_BASE` | Prod | Rails secret (auto-generated on Render) |
| `APP_HOST` | Prod | Your app domain (e.g., `your-app.onrender.com`) |
| `STORAGE_SERVICE` | Prod | Set to `cloudinary` to use Cloudinary storage |
| `CLOUDINARY_CLOUD_NAME` | Prod | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Prod | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Prod | Cloudinary API secret |
| `RESEND_API_KEY` | Prod | Resend API key for transactional email |
| `MAILER_SENDER` | Prod | From address for emails |

---

## Deployment (Render)

DocShare is configured for Docker-based deployment on [Render](https://render.com/).

### Steps

1. **Create a Web Service** on Render, connect your GitHub repo.
2. **Environment**: Select **Docker**.
3. **Add a PostgreSQL database** (Render add-on). Copy the `DATABASE_URL` it provides.
4. **Set environment variables** in the Render dashboard (see table above).
5. **Set build command**: Render uses the `Dockerfile` automatically.
6. The `bin/docker-entrypoint` script runs `db:prepare` on every deploy.

### External Services

- **Cloudinary** (free tier, 25 GB): Sign up at [cloudinary.com](https://cloudinary.com/), copy your cloud name, API key, and API secret.
- **Resend** (free tier): Sign up at [resend.com](https://resend.com/), create an API key.

---

## Routes Summary

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Dashboard (document list) |
| `GET` | `/users/sign_in` | Sign in |
| `GET` | `/users/sign_up` | Sign up |
| `GET` | `/documents/new` | Upload PDF form |
| `POST` | `/documents` | Create document |
| `GET` | `/documents/:id` | View document + PDF viewer + comments |
| `DELETE` | `/documents/:id` | Delete document |
| `POST` | `/documents/:id/share` | Generate share link |
| `DELETE` | `/documents/:id/share` | Revoke share link |
| `POST` | `/documents/:id/comments` | Add comment |
| `GET` | `/documents/:id/comments/:id/edit` | Edit comment |
| `PATCH` | `/documents/:id/comments/:id` | Update comment |
| `DELETE` | `/documents/:id/comments/:id` | Delete comment |
| `PATCH` | `/documents/:id/comments/:id/toggle_resolved` | Toggle resolved |
| `GET` | `/shared/:token` | View shared document (public) |
| `POST` | `/shared/:token/comments` | Add comment on shared document |
| `GET` | `/up` | Health check |

---

## Screenshots

> Add screenshots or GIFs of the application here to showcase the UI.
>
> Suggested captures:
> - Sign up / Sign in page
> - Dashboard with document list
> - PDF viewer with comments sidebar
> - Quote & Comment tooltip on text selection
> - Shared document public view
> - Comment with blockquote styling

---

## Future Enhancements

The following features are beyond the scope of the current PRD and can be considered for future development:

- **Real-time collaboration** -- Use ActionCable / WebSockets for live comment updates without page refresh, so multiple users see new comments instantly.
- **Email notifications** -- Notify the document owner when new comments are added; send email to invitees when a document is shared with them.
- **PDF annotation highlights** -- Persist text highlights on PDF pages linked to specific comments (canvas overlay or PDF.js annotation layer), so users can see exactly which passage a comment refers to.
- **Version history** -- Allow uploading new versions of a PDF, view previous versions, and diff/compare changes between versions.
- **Folder and tag organization** -- Organize documents into folders or apply tags for better discoverability and categorization on the dashboard.
- **Role-based access control** -- Define Viewer / Commenter / Editor roles per shared document, giving fine-grained permission control beyond the current owner-only model.
- **Comment threads and @mentions** -- Support @mentioning users in comments with autocomplete, triggering notifications for mentioned users.
- **Full-text search** -- Search inside PDF content (not just document titles) using pg_search or Elasticsearch for powerful document discovery.
- **Audit log** -- Track and display who viewed, commented on, shared, or deleted documents, providing accountability and transparency.
- **Download and print controls** -- Allow document owners to disable downloading or printing for shared documents, adding a layer of content protection.
- **Bulk upload** -- Upload multiple PDFs at once with a progress indicator and batch title editing.
- **OAuth / SSO** -- Support Google, GitHub, or SAML-based single sign-on for enterprise environments.
- **Comment export** -- Export all comments for a document as a CSV or PDF report for offline review.
- **Webhook integrations** -- Notify Slack, Microsoft Teams, or external systems on document events (upload, share, comment).
- **Accessibility enhancements** -- Conduct a full WCAG 2.1 AA compliance audit and implement improvements for screen readers, keyboard navigation, and color contrast.
- **Internationalization (i18n)** -- Add multi-language support using Rails i18n, starting with English and expanding based on user demand.
- **Mobile app / PWA** -- Convert to a Progressive Web App with offline PDF viewing capability, or build a dedicated mobile client.

---

## License

This project is open source under the [MIT License](https://opensource.org/licenses/MIT).
