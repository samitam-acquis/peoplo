SELECT cron.schedule(
  'attendance-reminders-job',
  '*/10 8-19 * * 1-6',
  $$
  SELECT
    net.http_post(
      url := 'https://ppdsxgkmnmjfwmpnamts.supabase.co/functions/v1/attendance-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwZHN4Z2ttbm1qZndtcG5hbXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTU5NTcsImV4cCI6MjA4MDg3MTk1N30.nqyBQ6C1XViRSzmp0ROaOydmuwegGgtemZxE99UczHE"}'::jsonb,
      body := concat('{"triggered_at": "', now(), '"}')::jsonb
    ) AS request_id;
  $$
);