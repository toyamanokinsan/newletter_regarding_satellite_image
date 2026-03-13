#!/bin/sh
# Wait for the app to be ready, then run collection on schedule.
# NOTIFY_AT format: "HH:MM" (JST)

NOTIFY_AT="${NOTIFY_AT:-07:00}"
APP_URL="${APP_URL:-http://app:3000}"
SECRET="${CRON_SECRET:-}"

echo "==> Cron collector started. Will collect daily at ${NOTIFY_AT} JST"

# Wait for app to be healthy
echo "==> Waiting for app to be ready..."
until curl -sf "${APP_URL}/api/papers?page=1&pageSize=1" > /dev/null 2>&1; do
  sleep 5
done
echo "==> App is ready."

while true; do
  # Current time in JST (HH:MM)
  NOW=$(TZ=Asia/Tokyo date +%H:%M)

  if [ "$NOW" = "$NOTIFY_AT" ]; then
    echo "==> [$(TZ=Asia/Tokyo date)] Running scheduled collection..."
    if [ -n "$SECRET" ]; then
      curl -s -X POST "${APP_URL}/api/collect" \
        -H "Authorization: Bearer ${SECRET}" | cat
    else
      curl -s -X POST "${APP_URL}/api/collect" | cat
    fi
    echo ""
    # Sleep 61 seconds to avoid double-trigger within the same minute
    sleep 61
  else
    sleep 30
  fi
done
