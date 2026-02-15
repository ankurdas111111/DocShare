# Rate limiting and throttling to prevent abuse.
# See https://github.com/rack/rack-attack

class Rack::Attack
  # ── Throttles ────────────────────────────────────────────────

  # Limit login attempts to 5 per 20 seconds per IP
  throttle("logins/ip", limit: 5, period: 20.seconds) do |req|
    req.ip if req.path == "/users/sign_in" && req.post?
  end

  # Limit signup attempts to 3 per minute per IP
  throttle("signups/ip", limit: 3, period: 1.minute) do |req|
    req.ip if req.path == "/users" && req.post?
  end

  # Limit comment creation on shared links to 10 per minute per IP
  # (anonymous users can spam without authentication otherwise)
  throttle("shared_comments/ip", limit: 10, period: 1.minute) do |req|
    req.ip if req.path.match?(%r{^/shared/.+/comments$}) && req.post?
  end

  # General request throttle: 300 requests per 5 minutes per IP
  throttle("requests/ip", limit: 300, period: 5.minutes, &:ip)

  # ── Response ─────────────────────────────────────────────────

  # Return 429 Too Many Requests with a Retry-After header
  self.throttled_responder = lambda do |matched, period, limit, req|
    now = Time.now.utc
    match_data = req.env["rack.attack.match_data"] || {}
    retry_after = (match_data[:period] || period) - (now.to_i % (match_data[:period] || period))

    [
      429,
      {
        "Content-Type" => "text/plain",
        "Retry-After" => retry_after.to_s
      },
      ["Rate limit exceeded. Try again in #{retry_after} seconds.\n"]
    ]
  end
end
