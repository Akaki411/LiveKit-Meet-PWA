# LiveKit PWA

![معاينة](./public/images/preview.png)

عميل غير رسمي لـ [LiveKit Meet](https://github.com/livekit-examples/meet) —
خادم مؤتمرات فيديو ذاتي الاستضافة، صُمِّم كبديل أخف من Jitsi.
يتميّز بـ **نظام مصادقة** مدمج و**نظام إشراف** و**استهلاك أقل لموارد الخادم**،
مما يتيح تشغيله حتى على خادم ضعيف.

## المزايا

- المصادقة.
- إمكانية دعوة ضيوف إلى الغرفة بدون حساب.
- إمكانية إنشاء غرف محمية بكلمة مرور وغرف للمشرفين فقط.
- إمكانيات الإشراف على الغرف.
- دردشة مع دعم المرفقات.
- 6 لغات للواجهة، وضع داكن، PWA (التثبيت كتطبيق على الهاتف).

# التثبيت

يحتاج التطبيق إلى جزأين إلزاميين: [**خادم وسائط LiveKit**](https://github.com/livekit/livekit) (الخادم)
و**تطبيق الويب** (العميل).

كما تُطلب اعتماديات إضافية كي تعمل جميع المكوّنات ولتحسين واجهة الويب:
- **livekit-vad** — نقل الصوت فقط (إلغاء ضوضاء متقدم)
- **livekit-egress** — خدمة تسجيل المؤتمرات
- **Redis** — لتخزين الطلبات مؤقتًا


## الخيار 1. Docker (موصى به)

1. أنشئ ملف الإعدادات من القالب:

   ```bash
   cp .env.example .env
   ```

   في `.env` عيّن:
   - `LIVEKIT_API_SECRET` — سرًّا عشوائيًا طويلًا (`openssl rand -hex 32`);
   - `AUTH_SECRET` — سرًّا عشوائيًا لملفات تعريف الارتباط الخاصة بالجلسة (`openssl rand -hex 32`);
   - `LIVEKIT_URL` — عنوان LiveKit العام للمتصفح (`wss://نطاقك`;
     للاختبار على جهاز واحد — `ws://localhost:7880`).


2. شغّل مجموعة الوحدات التي تحتاجها عبر الملفات الشخصية (profiles):

   ```bash
   docker compose up -d /     # الأساس: المكالمات، الدردشة، المصادقة
   --profile vad /            # + كشف الصوت (VAD)
   --profile recording        # + تسجيل المؤتمرات
   ```

   تُدمَج الملفات الشخصية؛ يمكنك تثبيت جزء منها أو جميعها دفعة واحدة:

   `docker compose --profile recording --profile vad up -d`.


### **الإدارة** — بأوامر Compose المعتادة:

```bash
docker compose up -d --build                 # إعادة بناء صورة الويب والتشغيل
docker compose restart                       # إعادة التشغيل دون إعادة البناء
docker compose pull && docker compose up -d  # تحديث الصور من السجل (registry)
```

## الخيار 2. التثبيت الأصلي (native)

يتطلب Node.js ≥ 18 و pnpm، إضافة إلى خادم LiveKit مثبّت مسبقًا.

```bash
pnpm install
pnpm build
pnpm start
```

تُقرأ الإعدادات من `.env.local` في جذر المشروع، والقالب موجود في الملف `.env.example`.
```bash
   cp .env.example .env.local
```
لكي يعمل بشكل صحيح، لا تنسَ تشغيل خادم [LiveKit](https://github.com/livekit/livekit).
