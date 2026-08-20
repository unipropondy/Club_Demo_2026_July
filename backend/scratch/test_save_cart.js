const http = require('http');

const payload = {
  tableId: '51B4059B-95F1-409C-85D8-C5E24D55AAD5', // Table 3
  userId: '00000000-0000-0000-0000-000000000000',
  orderId: '20260820-0011',
  items: [
    {
      id: '1B68A94A-0677-4ED3-B49C-7B59EA7D41EF', // Heineken
      name: 'Beer - Heineken',
      qty: 1,
      price: 10,
      isTakeaway: true,
      TakeawayCharge: 10,
      status: 'NEW'
    },
    {
      id: '67569328-1B6F-4FFA-9494-E090F1753379', // Tiger
      name: 'Beer - Tiger',
      qty: 1,
      price: 10,
      isTakeaway: true,
      // TakeawayCharge: undefined (so it will be omitted)
      status: 'NEW'
    }
  ]
};

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/orders/save-cart',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Save Cart response:', data);
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

req.write(JSON.stringify(payload));
req.end();
