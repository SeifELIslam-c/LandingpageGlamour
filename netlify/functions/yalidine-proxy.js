// netlify/functions/yalidine-proxy.js
// هذا الكود يعمل على خادم Netlify وليس في المتصفح
exports.handler = async (event, context) => {

  // 1. جلب المفاتيح السرية من Netlify (التي أضفتها في الخطوة الأولى)
  const { YALIDINE_API_ID, YALIDINE_API_TOKEN } = process.env;

  // 2. استخراج المسار المطلوب (مثل /wilayas أو /fees)
  // (من الإعدادات في netlify.toml)
  const path = event.queryStringParameters.path || '';

  // 3. إزالة المسار من البارامترات لإبقاء البارامترات الأخرى (مثل page_size)
  const params = new URLSearchParams(event.queryStringParameters);
  params.delete('path');
  const queryString = params.toString();

  // 4. بناء الرابط الحقيقي لـ Yalidine
  const YALIDINE_URL = `https://api.yalidine.app/v1/${path}${queryString ? `?${queryString}` : ''}`;

  try {
    // 5. إرسال الطلب الآمن من الخادم
    const response = await fetch(YALIDINE_URL, {
      method: event.httpMethod, // تمرير نوع الطلب (GET, POST, etc.)
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-ID": YALIDINE_API_ID,       // <-- المفتاح السري يُستخدم هنا بأمان
        "X-API-TOKEN": YALIDINE_API_TOKEN, // <-- المفتاح السري يُستخدم هنا بأمان
      },
      body: event.body ? event.body : null, // تمرير البيانات إذا كان الطلب POST
    });

    // 6. قراءة الرد من Yalidine
    const data = await response.json();

    // إذا كان الرد خطأ من Yalidine، أعد إرساله للمتصفح
    if (!response.ok) {
      console.error("Yalidine API Error:", data);
      return {
        statusCode: response.status,
        body: JSON.stringify(data),
      };
    }

    // 7. إرسال البيانات الناجحة إلى المتصفح
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error("Proxy Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Proxy Function Error", error: error.message }),
    };
  }
};
