// netlify/functions/yalidine-proxy.js

exports.handler = async (event, context) => {
  const { YALIDINE_API_ID, YALIDINE_API_TOKEN } = process.env;

  // --- بداية التعديل: استخراج المسار والبارامترات بطريقة مختلفة ---

  // 1. احصل على المسار الأصلي المطلوب من event.path (يزيل /yalidine-api/ منه)
  // مثال: إذا كان الطلب الأصلي /yalidine-api/wilayas?page_size=60
  // event.path قد يكون /.netlify/functions/yalidine-proxy (هذا غير مفيد)
  // لكن event.rawUrl أو headers يمكن أن يساعدا. الطريقة الأسهل هي الاعتماد على المسار الذي تم إرساله.
  // سنفترض أن Netlify يمرر المسار الأصلي بطريقة ما, أو نعتمد على هيكل الطلب
  // الطريقة الأكثر اعتمادية: استخراج المسار من event.path ولكن بإزالة الجزء الثابت

  let requestedPath = event.path.replace('/.netlify/functions/yalidine-proxy', ''); // قد لا يعمل دائمًا

  // طريقة بديلة وأكثر أمانًا تعتمد على هيكل URL الأصلي إذا كان متاحًا
  // Netlify يضيف header اسمه x-netlify-original-pathname
  const originalPathHeader = event.headers['x-netlify-original-pathname'];
  let path = '';
  if (originalPathHeader && originalPathHeader.startsWith('/yalidine-api/')) {
       path = originalPathHeader.substring('/yalidine-api/'.length); // استخراج ما بعد /yalidine-api/
  }

  // إزالة الشرطة المائلة الأولى إن وجدت (احتياطي)
  if (path.startsWith('/')) {
      path = path.substring(1);
  }
  console.log("Extracted Path from header:", path); // طباعة المسار المستخرج

  // 2. احصل على الـ query string الأصلي
  const queryString = event.rawQuery || ''; // Use rawQuery as it contains the original query string
  console.log("Original Query String:", queryString); // طباعة البارامترات

  // --- نهاية التعديل ---

  // 3. بناء الرابط الحقيقي لـ Yalidine
  const YALIDINE_URL = `https://api.yalidine.app/v1/${path}${queryString ? `?${queryString}` : ''}`;
  console.log("Constructed Yalidine URL:", YALIDINE_URL);

  // 4. إعداد خيارات الطلب (تبقى كما هي)
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

  // 5. إرسال الطلب ومعالجة الرد (تبقى كما هي)
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
           return {
               statusCode: response.status,
               body: JSON.stringify(data),
           };
        }
        console.warn("Yalidine API returned non-JSON response:", response.status);
    }

    if (!response.ok) {
      console.error("Yalidine API Error:", data);
      return {
        statusCode: response.status,
        body: JSON.stringify(data),
      };
    }

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
