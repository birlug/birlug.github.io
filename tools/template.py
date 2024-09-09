#!/bin/env python

import sys
from itertools import zip_longest
from ruamel.yaml import YAML
from persiantools import digits
from persiantools.jdatetime import JalaliDate, WEEKDAY_NAMES_FA, MONTH_NAMES_FA


def format_time(date, hour):
    date = JalaliDate(date.year, date.month, date.day)
    month = MONTH_NAMES_FA[date.month]
    dayofweek = WEEKDAY_NAMES_FA[date.weekday()]
    return digits.en_to_fa(f'{dayofweek} {date.day} {month} {date.year} - ساعت {hour}')

def format_presentations(speakers, topics):
    return '\n\n'.join(
        f'- ‏{topic}\n  ‏ارائه دهنده: {speaker}' if speaker else f'- ‏{topic}'
        for topic, speaker in zip_longest(topics, speakers)
    )


yaml = YAML(typ='safe', pure=True)
content = yaml.load(sys.stdin)

datetime = format_time(content['eventDate'], content['startTime'])
presentations = format_presentations(
        content['speakers'], content['topics'])

template = f'''\
{content['title']} [لاگ بیرجند](https://t.me/birlug)

{presentations}

📅 {datetime}
📍{content['address']}

❕*ظرفیت محدود*
ثبت نام *رایگان* و اطلاعات بیشتر:

- https://evand.com/events/birjandlug-{content['eventNumber']}
- https://birlug.ir/events/{content['eventNumber']}/info/
'''
print(template)
