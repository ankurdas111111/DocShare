module ApplicationHelper
  # Render markdown text as sanitized HTML.
  # Supports bold, italic, strikethrough, lists, links, and code.
  def render_markdown(text)
    return "" if text.blank?

    renderer = Redcarpet::Render::HTML.new(
      hard_wrap:       true,  # Convert newlines to <br>
      no_images:       true,  # Disallow images for security
      no_links:        false, # Allow links
      link_attributes: { rel: "noopener noreferrer", target: "_blank" }  # Prevent tabnabbing
    )

    markdown = Redcarpet::Markdown.new(renderer,
      autolink:            true,
      strikethrough:       true,
      fenced_code_blocks:  true,
      no_intra_emphasis:   true   # Don't treat underscores_inside_words as emphasis
    )

    # Render markdown then sanitize to whitelist safe tags only
    raw_html = markdown.render(text)

    sanitize(raw_html, tags: %w[p br strong em del ul ol li a code pre blockquote],
                       attributes: %w[href target rel])
  end
end
