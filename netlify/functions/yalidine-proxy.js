// netlify/functions/yalidine-proxy.js

exports.handler = async (event, context) => {
  // 1. جلب المفاتيح السرية من Netlify
  const { YALIDINE_API_ID, YALIDINE_API_TOKEN } = process.env;

  // --- بداية التعديل ---
  // 2. استخراج المسار المطلوب والتأكد من عدم وجود / في البداية
  let path = event.queryStringParameters.path || '';
  if (path.startsWith('/')) {
      path = path.substring(1); // إزالة الـ / الأولى إذا وجدت
  }
  // --- نهاية التعديل ---

  // 3. إزالة المسار من البارامترات لإبقاء البارامترات الأخرى (مثل page_size)
  const params = new URLSearchParams(event.queryStringParameters);
  params.delete('path');
  const queryString = params.toString();

  // 4. بناء الرابط الحقيقي لـ Yalidine
  const YALIDINE_URL = `https://api.yalidine.app/v1/${path}${queryString ? `?${queryString}` : ''}`;
  console.log("Constructed Yalidine URL:", YALIDINE_URL); // طباعة الرابط للتحقق في سجلات Netlify

  // 5. إعداد خيارات الطلب
  const fetchOptions = {
    method: event.httpMethod,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-API-ID": YALIDINE_API_ID,      // <-- المفتاح السري يُستخدم هنا بأمان
      "X-API-TOKEN": YALIDINE_API_TOKEN, // <-- المفتاح السري يُستخدم هنا بأمان
    },
  };

  // إضافة الجسم (body) فقط للطلبات التي ليست GET أو HEAD
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    fetchOptions.body = event.body;
  }

  try {
    // 6. إرسال الطلب الآمن من الخادم باستخدام الخيارات المحدثة
    const response = await fetch(YALIDINE_URL, fetchOptions); // استخدام الخيارات المعدلة

    // 7. قراءة الرد من Yalidine
    // Check if response body exists before parsing JSON
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
    } else {
        // Handle non-JSON responses if necessary, or assume error if JSON expected
        data = { error: { message: `Unexpected response type: ${contentType}` } };
        // If the response was actually okay but not JSON, adjust logic here
        if (!response.ok) {
           console.error("Yalidine API Error (Non-JSON):", response.status, response.statusText);
           return {
               statusCode: response.status,
               body: JSON.stringify(data), // Send back structured error
           };
        }
        // If response is OK but not JSON (unlikely for Yalidine?), return it as is or handle appropriately
        console.warn("Yalidine API returned non-JSON response:", response.status);
        // Maybe return plain text if applicable, or treat as success if status is 2xx
        // For simplicity, we'll return the structured error for now if it wasn't OK.
        // If it WAS ok, we let it pass through to the success return below, but data might be incomplete.
    }


    // إذا كان الرد خطأ من Yalidine، أعد إرساله للمتصفح
    if (!response.ok) {
      console.error("Yalidine API Error:", data);
      return {
        statusCode: response.status,
        body: JSON.stringify(data), // data might contain error details from Yalidine
      };
    }

    // 8. إرسال البيانات الناجحة إلى المتصفح
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
