
const hostName = 'internalweb';
const port = 8009;


const os = require('os');
const http = require('http');
const mdns = require('multicast-dns')({ loopback: true, reuseAddr: true });

const serviceType = '_http._tcp.local';
const ipAddress = Object.values(os.networkInterfaces())
  .flat()
  .find(i => i.family === 'IPv4' && !i.internal)?.address || '127.0.0.1';


hostNameLocal = hostName + ".local";
const hName = hostName + ".";

// ###################################################################################
// // NOTES:
// // http://internalweb.local and http://internalweb.local:8008 will both work.
// // http://brightsign-<serial>.local works too.


// // 1. A basic web server
// // If you have a web server running on port 8009, you can comment out 
// // this section and use your own server.
// ###################################################################################

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from mDNS');
}).listen(port);
console.log(`Web server running. Open in Chrome: http://internalweb.local:${port}`);

// 2. The mDNS responder configured for internalweb.local
mdns.on('query', (packet) => {
  const wantsService = packet.questions.some(
    q => q.name === serviceType && (q.type === 'PTR' || q.type === 'ANY')
  );
  const wantsHost = packet.questions.some(
    q => q.name === hostNameLocal && (q.type === 'A' || q.type === 'ANY')
  );

  if (wantsService || wantsHost) {
    const answers = [];

    if (wantsService) {
      answers.push({
        name: serviceType,
        type: 'PTR',
        class: 'IN',
        ttl: 4500,
        data: hName + serviceType
      });
    }

    if (wantsHost) {
      answers.push({
        name: hostNameLocal,
        type: 'A',
        class: 'IN',
        flush: true,
        ttl: 120,
        data: ipAddress
      });
    }

    mdns.respond({
      id: packet.id || 0,
      flags: { qr: 1, aa: 1 },
      answers,
      additionals: [
        { name: hName + serviceType, type: 'SRV', class: 'IN', flush: true, ttl: 120, data: { priority: 0, weight: 0, port: port, target: hostNameLocal } },
        { name: hName + serviceType, type: 'TXT', class: 'IN', flush: true, ttl: 120, data: ['A', 'serialnumber'] },
        { name: hostNameLocal, type: 'A', class: 'IN', flush: true, ttl: 120, data: ipAddress }
      ]
    });
  }
});
