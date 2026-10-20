# Railway probes the container over HTTP before attaching the HTTPS domain.
# Only the content-free health endpoint bypasses the HTTPS redirect.
Rails.application.config.ssl_options = { redirect: { exclude: ->(request) { request.path == '/health' } } }
