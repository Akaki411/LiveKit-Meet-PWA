[Русский](ruREADME.md) | [English](README.md) | [Français](frREADME.md) | [Español](spREADME.md) | [中文](zhREADME.md) | **العربية**

# LiveKit PWA

![معاينة](./public/images/preview.png)

عميل غير رسمي لـ [LiveKit Meet](https://github.com/livekit-examples/meet) — خادم مؤتمرات فيديو
ذاتي الاستضافة، صُمم كبديل أخف من Jitsi. يتميز بـ **نظام تفويض** مدمج، و**نظام إشراف على الغرف**،
و**استهلاك أقل لموارد الخادم**، ما يسمح بتشغيله حتى على خادم ضعيف الإمكانيات.

## الميزات

- نظام تفويض (تسجيل الدخول).
- إمكانية دعوة ضيوف إلى الغرفة دون الحاجة إلى حساب.
- إمكانية إنشاء غرف محمية بكلمة مرور وغرف مخصصة للمشرفين فقط.
- ميزات الإشراف على الغرف.
- محادثة نصية مع دعم إرفاق الملفات.
- 6 لغات للواجهة، وضع داكن، وتطبيق ويب تقدمي PWA (قابل للتثبيت كتطبيق على الهاتف).

# التثبيت

يحتاج التطبيق إلى جزأين أساسيين: [**خادم الوسائط LiveKit**](https://github.com/livekit/livekit) (الخادم) و**تطبيق الويب** (العميل).

ولكي تعمل جميع المكونات وتُحسَّن أداء واجهة الويب، تلزم تبعيات إضافية:
- **livekit-vad** — نقل الصوت فقط (إلغاء ضوضاء متقدم)
- **livekit-egress** — خدمة تسجيل المؤتمرات
- **Redis** — لتخزين الطلبات مؤقتًا (caching)


## الخيار 1: Docker (موصى به)

1. أنشئ ملف الإعدادات من القالب:

   ```bash
   cp .env.example .env
   ```

   في ملف `.env`، عيّن القيم التالية:
   - `LIVEKIT_API_SECRET` — سر عشوائي طويل (`openssl rand -hex 32`)؛
   - `AUTH_SECRET` — سر عشوائي لتوقيع كوكيز الجلسة (`openssl rand -hex 32`)؛
   - `LIVEKIT_URL` — عنوان LiveKit العام الذي يستخدمه المتصفح (`wss://your-domain`؛
     للاختبار على جهاز واحد استخدم `ws://localhost:7880`).


2. شغّل مجموعة الوحدات التي تحتاجها عبر الملفات الشخصية (profiles). **مهم:** في Docker
   Compose v2 يجب وضع الخيار `--profile` **قبل** الأمر `up`، وليس بعده —
   الأمر `docker compose up -d --profile vad` سيُرجع الخطأ `unknown flag: --profile`.

   ```bash
   docker compose up -d                              # الأساسي: المكالمات، الدردشة، التفويض
   docker compose --profile vad up -d                # + كشف الصوت (VAD)
   docker compose --profile recording up -d          # + تسجيل المؤتمرات
   docker compose --profile vad --profile recording up -d   # كل شيء دفعة واحدة
   ```

   يمكن الجمع بين الملفات الشخصية بأي شكل. كبديل، يمكن ضبطها عبر متغير البيئة
   `COMPOSE_PROFILES` (مثلًا داخل `.env`):

   ```bash
   COMPOSE_PROFILES=vad,recording docker compose up -d
   ```

   عند تفعيل الملفات الشخصية، يجب أيضًا تمرير `--profile ...` (أو ضبط `COMPOSE_PROFILES`
   في `.env`) في الأوامر اللاحقة (`restart`، `pull`، `down`) — وإلا فلن يتعرف عليها Compose،
   فمثلًا لن يوقف الأمر `down` خدمات تلك الملفات الشخصية.


### **الإدارة** — باستخدام أوامر Compose الاعتيادية:

```bash
docker compose up -d --build                 # إعادة بناء صورة الويب وتشغيلها
docker compose restart                       # إعادة التشغيل دون إعادة البناء
docker compose pull && docker compose up -d  # تحديث الصور من المستودع
```

## الخيار 2: التثبيت الأصلي (Native)

يتطلب [Bun](https://bun.sh)، بالإضافة إلى خادم LiveKit مثبّت مسبقًا.

```bash
bun install
bun run build
bun run start
```

تُقرأ الإعدادات من ملف `.env.local` في جذر المشروع، والقالب موجود في `.env.example`.
```bash
   cp .env.example .env.local
```
لضمان عمل التطبيق بشكل صحيح، لا تنسَ تشغيل خادم [LiveKit](https://github.com/livekit/livekit).
