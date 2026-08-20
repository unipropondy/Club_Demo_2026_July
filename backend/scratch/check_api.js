const http = require('http');

http.get('http://localhost:3000/api/menu/dishes/all', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const dishes = JSON.parse(data);
      const heineken = dishes.find(d => d.Name.includes('Heineken') || d.DishId === '1B68A94A-0677-4ED3-B49C-7B59EA7D41EF');
      console.log('Heineken dish from API:', heineken);
    } catch (err) {
      console.error('Error parsing JSON:', err.message);
    }
  });
}).on('error', (err) => {
  console.error('API request error:', err.message);
});
