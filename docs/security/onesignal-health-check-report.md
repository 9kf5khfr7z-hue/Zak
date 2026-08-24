# تقرير OneSignal Credential Health Check

**المشروع:** ZAK | زاك  
**النطاق:** Pre-Production فقط  
**الحالة:** Production Push مغلق (`PUSH_ENABLED=false`)

## النتيجة التنفيذية

أُضيف فحص اعتماد OneSignal قراءة فقط يستخدم `PUSH_PROJECT_ID` و`PUSH_API_KEY` المحقونين من Secret Manager. الفحص يستعمل طلب `GET` إلى endpoint معلومات التطبيق، ولا ينشئ Notification ولا يستدعي endpoint الإرسال `POST /notifications`.

خلال الاختبار الفعلي أعاد OneSignal استجابة **HTTP 400**. صُنفت النتيجة الآن كـ **MISMATCH** مع رسالة عامة لا تكشف أي Secret، لأن الخدمة رفضت App ID المرسل. لذلك لا نعتمد credentials كحالة `HEALTHY` بعد؛ يلزم مراجعة قيمة `PUSH_PROJECT_ID` في Secret Manager والتأكد من أنها OneSignal App ID الصحيح للتطبيق المرتبط بالمفتاح.

## مصفوفة الحالات

| الحالة | المعنى | النتيجة الحالية |
|---|---|---|
| `HEALTHY` | المصادقة ناجحة وApp ID في الاستجابة يطابق المتوقع | لم تتحقق |
| `UNAUTHORIZED` | OneSignal رفض App API Key | لم تظهر |
| `NOT_FOUND` | التطبيق غير موجود لدى OneSignal | لم تظهر |
| `MISMATCH` | App ID غير مقبول أو لا يطابق التطبيق المتوقع | **ظهرت مع HTTP 400** |
| `ERROR` | فشل اتصال أو استجابة خدمة غير متوقعة | لم تظهر |

## الضوابط الأمنية

يبقى `PUSH_ENABLED=false`، ولذلك لا يمكن لهذا الفحص تفعيل إرسال عام. لا تُطبع قيمة `PUSH_API_KEY` ولا جسم الاستجابة ولا أي Secret في السجلات أو رسالة الخطأ. كما أثبتت الاختبارات أن فحص الاعتماد لا يستدعي endpoint الإرسال.

## الفحوصات البرمجية

| الفحص | النتيجة |
|---|---|
| Vitest | **76 ناجحة، 1 متخطاة** |
| TypeScript | **ناجح** |
| ESLint | **ناجح** |
| Build | **ناجح** |

## الإجراء المطلوب قبل إعادة الفحص

يراجع المشرف قيمة `PUSH_PROJECT_ID` في Secret Manager ويتأكد من نسخ **OneSignal App ID** كاملاً وبدون مسافات أو علامات اقتباس، ومن ارتباطه بالتطبيق الذي صدر منه **App API Key**. لا ينبغي تغيير `PUSH_ENABLED` إلى `true`، ولا إعادة استخدام المفتاح في المحادثة أو GitHub.

بعد تصحيح App ID، يُعاد تشغيل Health Check القراءة فقط. لا تُغلق بوابة الاعتماد إلا عند ظهور `HEALTHY` فعلياً من OneSignal.

## المراجع

[1]: https://documentation.onesignal.com/reference/view-an-app "OneSignal — View an app"
[2]: https://documentation.onesignal.com/reference/create-message "OneSignal — Create message"
