# ملاحظات تكامل رمز التحقق عبر واتساب

راجعت وثائق Meta الرسمية في 21 أغسطس 2026.

توضح صفحة التسعير الرسمية أن Cloud API يحاسب على الرسائل القالبية عند التسليم، وأن الأسعار تتأثر بفئة القالب ورمز بلد المستلم، مع تغييرات معلنة في فئات الرسائل خلال 2026. لذلك لا يمكن تثبيت تكلفة نهائية لليبيا داخل التطبيق دون حساب Business Manager ومراجعة جدول Meta الحالي.

توضح صفحة Authentication templates أن رسائل المصادقة يجب أن تستخدم قالباً مخصصاً للمصادقة، وأن النص الأساسي ثابت ويحتوي على رمز التحقق، مع إمكانية إضافة تنبيه أمني ومدة انتهاء. كما أن الحماية للأجهزة المرتبطة مفعلة افتراضياً في Cloud API، وتصل الرسالة الأساسية إلى جهاز واتساب الرئيسي.

القرار الهندسي: نبني واجهة ZAK على طبقة `WhatsAppOtpProvider` مستقلة. في الإنتاج يكون المزود الأول هو Meta WhatsApp Cloud API مباشرة لتجنب هامش مزود وسيط إضافي، ويمكن تبديله بمزود BSP عند الحاجة. في التطوير نستخدم موفراً محلياً يسجل الرمز في الخادم فقط ولا يرسله لأي رقم. لا نضع رمز OTP أو access token داخل تطبيق الهاتف.

المراجع:

1. https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing — Pricing on the WhatsApp Business Platform.
2. https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/authentication-templates/authentication-templates — Authentication templates.
