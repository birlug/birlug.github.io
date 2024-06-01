#!/bin/env bash

changes=$(git diff --name-only HEAD~1 | grep event)

# TODO: disallow multiple posters
poster=$(echo "$changes" | grep poster)

# generate the caption
info=$(echo $changes | grep info.md)
content=$(cat $info | sed -n '/---/,/---/{ /---/!{ p } }')
caption=$(echo "$content" | ./tools/template.py)

if [[ "${TEST}" -eq 0 ]]
then
    echo "------ poster ------"
    echo "$poster"
    echo "------ info ------"
    echo "$info"
    echo "------ caption ------"
    echo "$caption"
fi

# telegram
message_id=$(curl -sS "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto" \
     -F chat_id="${CHAT_ID}" \
     -F photo=@"${poster}" \
     -F caption="$caption" \
     -F parse_mode=Markdown | jq .result.message_id)

# pin the message
curl -s -o /dev/null -w "telegram response: %{http_code}" \
     -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/pinChatMessage" \
     -d chat_id="${CHAT_ID}" \
     -d message_id="$message_id"

# mastodon
# skip sending message to mastodon in test mode
[[ "${TEST}" -eq 1 ]] && exit 0

# mastodon can't parse markdown
# so we should remove markdown symbols (bold/link) from the caption
caption=$(echo "$caption" | sed 's/\*//g' | sed -E 's/\[([^]]+)\]\([^)]+\)/\1/g')

image_id=$(curl -sS "${MASTODON_URL}/api/v2/media" \
    -H "Authorization: Bearer ${MASTODON_TOKEN}" \
    -F file=@"${poster}" | jq -r .id)

curl -s -o /dev/null -w "mastodon response: %{http_code}" \
     -X POST "${MASTODON_URL}/api/v1/statuses" \
     -H "Authorization: Bearer ${MASTODON_TOKEN}" \
     -F status="$caption" \
     -F media_ids[]="$image_id"
