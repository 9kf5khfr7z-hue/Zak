# OneSignal Credential Health Check Notes

المصدر الرسمي: https://documentation.onesignal.com/reference/view-an-app

- فحص الاعتماد القراءة فقط يستخدم `GET https://api.onesignal.com/apps/{app_id}?view=config`.
- المصادقة تكون عبر ترويسة `Authorization: Key <App API Key>` وترويسة `Content-Type: application/json`.
- الاستجابة الناجحة 200 تتضمن `id` و`name` وبيانات إعداد التطبيق؛ يجب مقارنة `id` مع `PUSH_PROJECT_ID`.
- 403 تعني أن المفتاح لا يملك صلاحية رؤية التطبيق، و404 تعني أن App ID غير صحيح أو أن المفتاح لا يصل إلى منظمة التطبيق، و429 تعني تجاوز حد الطلبات.
- لا يُسمح باستدعاء POST `/notifications` أو أي endpoint إرسال ضمن Health Check.
- App ID معرّف عام UUID v4، أما App API Key فهو Secret خاص ويجب عدم كشفه في الكود أو السجلات.

المصدر الرسمي: https://documentation.onesignal.com/docs/en/keys-and-ids

- App API Key مخصص لتطبيق OneSignal واحد، وOrganization API Key مخصص لإدارة المنظمة؛ يجب استخدام App API Key.
- قيمة App API Key تبدأ عادةً بـ `os_v2_app_` وتظهر مرة واحدة عند الإنشاء أو التدوير.
- يُنصح بتخزين المفتاح في Secret Manager وعدم وضعه في كود العميل أو GitHub.
