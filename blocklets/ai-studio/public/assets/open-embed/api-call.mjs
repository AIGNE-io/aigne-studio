export default async function call({ input, aid }) {
  const sessionId = Date.now().toString();
  // FIXME: 如何获取正确的 prefix -> /aigne-runtime
  const prefix = '/aigne-runtime';
  const response = await fetch(`${prefix}/api/ai/call`, {
    method: 'POST',
    body: JSON.stringify({
      aid,
      sessionId,
      parameters: {
        question: input,
      },
      working: true,
    }),
    headers: {
      'Content-Type': 'application/json',
      // Accept: 'text/event-stream',
    },
    // responseType: 'stream',
  });
  const body = response.body;
  const reader = body.getReader();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const currentText = new TextDecoder().decode(value);
    result += currentText;
  }
  const jsonResult = JSON.parse(result);
  return jsonResult['$text'] || jsonResult;
}
