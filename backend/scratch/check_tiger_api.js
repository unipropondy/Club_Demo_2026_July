const http = require('http');

http.get('http://localhost:3000/api/menu/dishes/all', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const dishes = JSON.parse(data);
      const tiger = dishes.find(d => d.Name.includes('Tiger') || d.DishId === '67569328-1B6F-4FFA-9494-E090F1753379');
      console.log('Tiger dish from API:', tiger);
    } catch (err) {
      console.error('Error parsing JSON:', err.message);
    }
  });
}).on('error', (err) => {
  console.error('API request error:', err.message);
});
