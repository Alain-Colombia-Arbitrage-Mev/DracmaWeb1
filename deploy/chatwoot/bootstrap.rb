# Idempotent bootstrap for a new, dedicated DRACMA installation. No emails sent.
require 'json'
faq = JSON.parse(File.read('/opt/dracma/faq.json'))
user = User.find_by(email: ENV.fetch('DRACMA_ADMIN_EMAIL'))
unless user
  user = User.new(email: ENV.fetch('DRACMA_ADMIN_EMAIL'), name: 'Administración DRACMA', password: ENV.fetch('DRACMA_ADMIN_PASSWORD'), password_confirmation: ENV.fetch('DRACMA_ADMIN_PASSWORD'))
  user.skip_confirmation!
  user.skip_confirmation_notification!
  user.save!
  user.access_token.update!(token: ENV.fetch('DRACMA_ADMIN_API_TOKEN'))
end
account = Account.find_or_create_by!(name: 'DRACMA') { |a| a.locale = 'es' }
unless AccountUser.exists?(account: account, user: user)
  AccountUser.insert_all!([{account_id: account.id, user_id: user.id, role: 1, availability: 1, created_at: Time.current, updated_at: Time.current}])
end
inbox = account.inboxes.find_by(name: 'Agente DRACMA · Web')
unless inbox
  channel = Channel::Api.create!(account: account, identifier: ENV.fetch('DRACMA_INBOX_IDENTIFIER'))
  inbox = account.inboxes.create!(name: 'Agente DRACMA · Web', channel: channel, enable_auto_assignment: false, enable_email_collect: false, greeting_enabled: false)
end
unless InboxMember.exists?(inbox: inbox, user: user)
  InboxMember.insert_all!([{inbox_id: inbox.id, user_id: user.id, created_at: Time.current, updated_at: Time.current}])
end
bot = account.agent_bots.find_or_create_by!(name: 'Agente DRACMA')
bot.update!(description: 'Respuestas basadas en las preguntas frecuentes y documentación pública de DRACMA.', outgoing_url: ENV.fetch('DRACMA_BOT_WEBHOOK_URL'), secret: ENV.fetch('DRACMA_BOT_WEBHOOK_SECRET'))
bot.access_token.update!(token: ENV.fetch('DRACMA_AGENT_API_TOKEN')) unless bot.access_token.token == ENV.fetch('DRACMA_AGENT_API_TOKEN')
AgentBotInbox.find_or_create_by!(inbox: inbox, agent_bot: bot) { |link| link.status = 'active' }
faq.each do |entry|
  response = account.canned_responses.find_or_initialize_by(short_code: entry.fetch('id'))
  response.update!(content: entry.fetch('answer'))
end

# The bot stores delivery metadata only, using a separate least-privilege role.
db = ActiveRecord::Base.connection
password = db.quote(ENV.fetch('DRACMA_AGENT_DB_PASSWORD'))
unless db.select_value("SELECT 1 FROM pg_roles WHERE rolname = 'dracma_agent'")
  db.execute("CREATE ROLE dracma_agent LOGIN PASSWORD #{password}")
end
db.execute('CREATE SCHEMA IF NOT EXISTS dracma_agent AUTHORIZATION dracma_agent')
db.execute('CREATE TABLE IF NOT EXISTS dracma_agent.events (message_id bigint PRIMARY KEY, conversation_id bigint NOT NULL, state text NOT NULL DEFAULT \'pending\', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())')
db.execute('ALTER TABLE dracma_agent.events OWNER TO dracma_agent')
db.execute('REVOKE ALL ON SCHEMA dracma_agent FROM PUBLIC')

# Expose identifiers to the internal bot only; this never returns an admin token.
metadata = {account_id: account.id, inbox_id: inbox.id, inbox_identifier: inbox.channel.identifier}
File.write('/app/storage/dracma-inbox.json', JSON.generate(metadata), mode: 'w', perm: 0600)
STDOUT.puts('DRACMA bootstrap ready')
