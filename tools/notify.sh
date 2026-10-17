#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${EVENT:?Set EVENT to event directory slug}"
[[ "$EVENT" =~ ^[a-zA-Z0-9_-]+$ ]] || { echo "Invalid event slug" >&2; exit 1; }
caption=$(python3 tools/template.py --event "$EVENT")
poster=$(python3 tools/template.py --event "$EVENT" --poster-url --media-base "${MEDIA_BASE_URL:-https://birlug.github.io}")
if [[ "${1:-}" == "--dry-run" ]]; then
  printf '%s\n\nPoster: %s\n' "$caption" "$poster"
  exit 0
fi
: "${TELEGRAM_TOKEN:?Set TELEGRAM_TOKEN}"
: "${CHAT_ID:?Set CHAT_ID}"
if [[ -n "$poster" ]]; then
  response=$(curl --fail --silent --show-error "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto" \
    --form-string chat_id="$CHAT_ID" --form-string photo="$poster" --form-string caption="$caption" --form-string parse_mode=Markdown)
else
  response=$(curl --fail --silent --show-error "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
    --form-string chat_id="$CHAT_ID" --form-string text="$caption" --form-string parse_mode=Markdown)
fi
message_id=$(printf '%s' "$response" | jq -er 'select(.ok == true) | .result.message_id')
curl --fail --silent --show-error "https://api.telegram.org/bot${TELEGRAM_TOKEN}/pinChatMessage" \
  --data-urlencode chat_id="$CHAT_ID" --data-urlencode message_id="$message_id" | jq -e '.ok == true' >/dev/null
[[ "${TEST:-1}" == 1 ]] && exit 0
: "${MASTODON_TOKEN:?Set MASTODON_TOKEN}"
: "${MASTODON_URL:?Set MASTODON_URL}"
caption=$(printf '%s' "$caption" | sed 's/\*//g' | sed -E 's/\[([^]]+)\]\([^)]+\)/\1/g')
media=()
if [[ -n "$poster" ]]; then
  file=$(mktemp --suffix=.jpg)
  trap 'rm -f "$file"' EXIT
  curl --fail --silent --show-error "$poster" -o "$file"
  image_id=$(curl --fail --silent --show-error "${MASTODON_URL}/api/v2/media" \
    -H "Authorization: Bearer ${MASTODON_TOKEN}" -F file=@"$file" | jq -er '.id')
  media=(--form-string "media_ids[]=$image_id")
fi
curl --fail --silent --show-error "${MASTODON_URL}/api/v1/statuses" \
  -H "Authorization: Bearer ${MASTODON_TOKEN}" --form-string status="$caption" "${media[@]}" | jq -e '.id != null' >/dev/null
