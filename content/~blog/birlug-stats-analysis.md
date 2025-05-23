---
title: "داده‌ها، داده‌ها، داده‌ها"
date: 2024-11-13T00:00:00+04:30
persianDate: 1403-08-23
layout: post
summary: تحلیل و مصورسازی داده‌های لاگ
type: news
darft: true
---

*نویسنده: نوراحمد خسروی*

## ۱- مقدمه

ما توی دنیایی زندگی می‌کنیم که پر از داده‌ است؛ هر جا که نگاه کنیم، داده‌ها در حال تولید شدن و ذخیره شدن هستند. هر بار که لپ‌تاپ رو روشن می‌کنیم یا توی خط فرمان دستوری رو اجرا می‌کنیم، داریم داده جدیدی تولید می‌کنیم. حتی می‌تونیم داده‌های مربوط به زندگی روزمره‌مون رو هم ثبت کنیم، مثلاً ساعت‌هایی که کار یا مطالعه می‌کنیم یا خرج و درآمدهایی که روزانه و هفتگی داریم.
این داده‌ها به‌تنهایی خیلی معنی ندارن، ولی وقتی تعداد زیادی ازشون رو جمع کنیم، می‌تونیم الگوهای مخفی رو کشف کنیم و از اون‌ها بینش‌هایی بگیریم که تو تصمیم‌گیری‌هامون تأثیر مثبت بذارن. به‌عنوان نمونه، در ادامه قراره از داده‌های لاگ استفاده کنیم تا ببینیم تحلیل داده چطوری می‌تونه به درک بهتر کمک کنه. این کار رو در چند بخش مختلف انجام می‌دیم که هرکدوم نمایانگر بخشی از تحلیل لاگ هست. فقط توجه داشته باشین که هدف این نوشته آموزش تحلیل داده‌ها نیست و فقط می‌خوایم تأثیرش رو نشون بدیم.

## ۲- جمع‌آوری داده‌ها

برای تحلیل داده اول از همه باید داده‌ای داشته باشیم. هر چی تعداد داده‌هامون بیشتر باشه، کیفیت تحلیل هم بهتر می‌شه. هر رکورد از داده‌ها ستون‌هایی داره که بهشون ویژگی (feature) می‌گیم. تعداد این ویژگی‌ها رو با m نشون می‌دیم و هر چه مقدار m بیشتر باشه، مثل زمانی که داده‌های بلندمدت جمع کردیم، می‌تونیم روندها و تغییرات رو توی طول زمان مشاهده کنیم و تصمیم‌های بهتری بگیریم.
فرض کنید می‌خوایم مصرف برق خونه‌مون رو مدیریت کنیم. اگه داده‌های مصرف برق روزانه رو تو یه بازه چندماهه جمع‌آوری کنیم، متوجه می‌شیم که چه الگوهایی وجود داره؛ مثلاً ممکنه ببینیم تو فصل سرما مصرف برق زیادتر می‌شه. با این اطلاعات می‌تونیم تصمیم بگیریم که در چه زمان‌هایی بهینه‌تر از وسایل گرمایشی استفاده کنیم و در نهایت هزینه‌ها رو کاهش بدیم.

![مجموعه داده](/blog/birlug-stats-analysis/features.png)

### ۱-۲ مهندسی ویژگی (Feature Engineering)

مهندسی ویژگی بخش مهمی از تحلیل داده‌ است که مشخص می‌کنه کدوم ستون‌ها رو باید برای تحلیل انتخاب کنیم یا ویژگی جدیدی بسازیم. مثلاً ما از ستون تاریخ جلسات استفاده کردیم تا دو ویژگی جدید به اسم "روز" و "ماه" بسازیم و اینجوری میتونیم روند جلسات رو بر اساس ماه و سال بررسی کنیم.

## ۳- مصورسازی داده‌ها در قالب نمودارهای مختلف

توی این بخش، داده‌ها رو در قالب نمودارهای مختلف نشون می‌دیم و دلیل ایجاد هر نمودار رو توضیح می‌دیم.

### ۱-۳ شیت Seasons #sessions

این شیت تعداد جلسات رو بر اساس فصل‌های سال نمایش می‌ده. شکل زیر نمونه‌ای از نمودار تعداد جلسات در فصل‌های مختلف سال رو نشون می‌ده.

![تعداد جلسات](/blog/birlug-stats-analysis/Seasons-sessions.png)

### ۲-۳ شیت Seasons #attendees

مشابه نمودار قبلی، اینجا تعداد شرکت‌کنندگان در هر فصل رو نشون می‌دیم.

![تعداد شرکت‌کنندگان](/blog/birlug-stats-analysis/Seasons-attendees.png)

### ۳-۳ شیت Presenters

این شیت برای بررسی ارائه‌دهندگان لاگ ایجاد شده و شامل تعداد جلسات هر ارائه‌دهنده و تعداد شرکت‌کنندگان آن جلسات می‌باشد. ستونی هم به اسم "نرخ جذب" ایجاد شده که نشون می‌ده هر ارائه‌دهنده چقدر موفق به جذب شرکت‌کننده بوده. این شاخص، معیار دقیقی برای سنجش کیفیت ارائه نیست، چون ممکنه موضوع ارائه برای مخاطبین جذاب بوده باشه یا نه.

![ارائه‌دهندگان](/blog/birlug-stats-analysis/Presenters.png)

### ۴-۳ شیت Subjects

شکل زیر نموداری رو نشون می‌ده که بر اساس موضوعات برگزاری جلسات ایجاد شده. در این شیت، ویژگی‌ای به نام "پرطرفدار بودن موضوع" اضافه کردیم که تشخیص می‌ده آیا موضوعی محبوبیت بالایی بین مخاطبین داره یا نه. این شاخص هم تخمینی اولیه برای سنجش پرطرفدار بودن موضوع‌هاست.

![موضوعات](/blog/birlug-stats-analysis/Subjects.png)

# ۴- نتیجه‌گیری

در پایان، این مقاله سعی می‌کنه اهمیت جمع‌آوری و تحلیل داده‌ها رو نشون بده. شما هم می‌تونین از داده‌های روزمره‌تون (مثل خرج و مخارج روزانه‌تون) استفاده کنین و با تحلیلشون به بینش‌های جالبی برسین. مطمئن باشین که با این کار چیزهای جدیدی یاد می‌گیرین و دید بهتری نسبت به روندهای اطراف خودتون پیدا می‌کنین.

اگه دوست دارین فایل تحلیل رو ببینین، روی این [لینک](/blog/birlug-stats-analysis/birLugStats.ods) کلیک کنین.

"داده‌ها زبان واقعیت‌ها هستند؛ از آن‌ها برای ساخت آینده‌ای روشن‌تر استفاده کنید." – چت‌چی‌بی‌تی
