const API_KEY = "AIzaSyA-lgIhA4_HrIpyM1K2wiWxa6zV7xBkJrg";

async function testGemini() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Say 'Gemini API is working!'",
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await res.json();
  console.log(data);
}

testGemini().catch(console.error);