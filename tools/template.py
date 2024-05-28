#!/bin/env python

import sys
import yaml
from persiantools import digits
from persiantools.jdatetime import JalaliDate, WEEKDAY_NAMES_FA, MONTH_NAMES_FA


def format_time(date, hour):
    date = JalaliDate(date.year, date.month, date.day)
    month = MONTH_NAMES_FA[date.month]
    dayofweek = WEEKDAY_NAMES_FA[date.weekday()]
    return digits.en_to_fa(f'{dayofweek} {date.day} {month} {date.year} - ساعت {hour}')

def format_presentations(speakers, topics):
    presentations = []
    for (speaker, topic) in zip(speakers, topics):
        presentations.append(f'- ‏{topic}\n  ‏ارائه دهنده: {speaker}')
    return '\n\n'.join(presentations)


content = yaml.safe_load(sys.stdin)
datetime = format_time(content['eventDate'], content['startTime'])
presentations = format_presentations(
        content['speakers'], content['topics'])

template = f'''\
{content['title']} [لاگ بیرجند](https://t.me/birlug)

{presentations}

📅 {datetime}
📍{content['locations'][0]}

❕*ظرفیت محدود*
ثبت نام *رایگان* و اطلاعات بیشتر:

- https://evand.com/events/birjandlug-{content['eventNumber']}
- https://birlug.ir/events/{content['eventNumber']}/info/
'''
print(template)
