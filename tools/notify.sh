#!/bin/env bash

changes=$(git diff --name-only HEAD~1 | grep event)

# TODO: disallow multiple posters
poster=$(echo "$changes" | grep poster)

# generate the caption
info=$(echo $changes | grep info.md)
content=$(cat $info | sed -n '/---/,/---/{ /---/!{ p } }')
caption=$(echo "$content" | ./tools/template.py)

if [[ -n "${TEST}" ]]
then
    echo "------ poster ------"
    echo "$poster"
    echo "------ info ------"
    echo "$info"
    echo "------ caption ------"
    echo "$caption"
fi

curl -s -o /dev/null -w "response: %{http_code}" \
     -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto" \
     -F chat_id="${CHAT_ID}" \
     -F photo=@"${poster}" \
     -F caption="$caption" \
     -F parse_mode=Markdown
