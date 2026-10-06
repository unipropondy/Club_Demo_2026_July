const net = require('net');

const client = new net.Socket();
client.setTimeout(5000);

console.log("Connecting to 192.168.0.247:9100...");
client.connect(9100, '192.168.0.247', () => {
  console.log("✅ Socket connected to 192.168.0.247:9100!");
  client.write(Buffer.from("TEST PRINT FROM KDS\n\n\n\x1dV\x42\x00"), () => {
    console.log("✅ Data sent!");
    client.end();
  });
});

client.on('error', (err) => {
  console.error("❌ Socket error:", err.message);
});

client.on('timeout', () => {
  console.error("❌ Socket timeout!");
  client.destroy();
});

client.on('close', () => {
  console.log("Socket closed.");
  process.exit(0);
});
