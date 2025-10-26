// netlify/functions/yalidine-proxy.js

exports.handler = async (event, context) => {
  const { YALIDINE_API_ID, YALIDINE_API_TOKEN } = process.env;

  // --- بداية التعديل: استخراج المسار من event.path ---

  // 1. احصل على المسار الكامل للطلب كما تراه الدالة
  const functionPath = event.path; // e.g., /.netlify/functions/yalidine-proxy/wilayas
  console.log("Function Path:", functionPath);

  // 2. استخرج الجزء الذي يأتي *بعد* اسم الدالة
  const functionBasePath = '/.netlify/functions/yalidine-proxy';
  let path = '';
  if (functionPath.startsWith(functionBasePath + '/')) {
      path = functionPath.substring(functionBasePath.length + 1); // Get the part after the function name + slash
  } else if (functionPath === functionBasePath) {
      // Handle cases where no path is provided after the function name (might be an error or root request)
      path = ''; // Or handle as appropriate, maybe default path?
  }
  console.log("Extracted Path from event.path:", path); // Should be 'wilayas'

  // إزالة الشرطة المائلة الأولى إن وجدت (احتياطي إضافي)
  if (path.startsWith('/')) {
      path = path.substring(1);
  }

  // 3. احصل على الـ query string الأصلي
  const queryString = event.rawQuery || '';
  console.log("Original Query String:", queryString);

  // --- نهاية التعديل ---

  // 4. بناء الرابط الحقيقي لـ Yalidine
  const YALIDINE_URL = `https://api.yalidine.app/v1/${path}${queryString ? `?${queryString}` : ''}`;
  console.log("Constructed Yalidine URL:", YALIDINE_URL); // تحقق من الرابط النهائي

  // 5. إعداد خيارات الطلب (تبقى كما هي)
  const fetchOptions = {
    method: event.httpMethod,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-API-ID": YALIDINE_API_ID,
      "X-API-TOKEN": YALIDINE_API_TOKEN,
    },
  };
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    fetchOptions.body = event.body;
  }

  // 6. إرسال الطلب ومعالجة الرد (تبقى كما هي)
  try {
    const response = await fetch(YALIDINE_URL, fetchOptions);
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
    } else {
        data = { error: { message: `Unexpected response type: ${contentType}` } };
        if (!response.ok) {
           console.error("Yalidine API Error (Non-JSON):", response.status, response.statusText);
           return { statusCode: response.status, body: JSON.stringify(data) };
        }
        console.warn("Yalidine API returned non-JSON response:", response.status);
    }

    if (!response.ok) {
      console.error("Yalidine API Error:", data);
      return { statusCode: response.status, body: JSON.stringify(data) };
    }

    return { statusCode: 200, body: JSON.stringify(data) };

  } catch (error) {
    console.error("Proxy Function Error:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Proxy Function Error", error: error.message }) };
  }
};
