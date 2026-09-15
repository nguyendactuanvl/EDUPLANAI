const http = require('http');

const data = JSON.stringify({
  subject: "Toán",
  grade: "10",
  topic: "Bài 1"
});

const req = http.request('http://localhost:3000/api/generate-plan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log('BODY:', chunk.substring(0, 100));
  });
});

req.on('error', (e) => {
  console.error('problem with request:', e.message);
});
req.write(data);
req.end();
