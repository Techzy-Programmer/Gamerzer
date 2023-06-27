/* Node.js static file web server */

// Importing necessary modules
const { exec } = require('child_process');
const path = require('path');
const http = require('http');
const url = require('url');
const fs = require('fs');
const os = require('os');
const PORT = 80;

// Maps file extension to MIME types which helps browser
// to understand what to do with the file

const mimeType = {
	'.ico': 'image/x-icon',
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.css': 'text/css',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.wav': 'audio/wav',
	'.mp3': 'audio/mpeg',
	'.svg': 'image/svg+xml',
	'.pdf': 'application/pdf',
	'.doc': 'application/msword',
	'.eot': 'application/vnd.ms-fontobject',
	'.ttf': 'application/font-sfnt'
};

function getPthName(pth) {
	const sanitizePath = path.normalize(pth).replace(/^(\.\.[\/\\])+/, '');
	let pathname = path.join(__dirname, sanitizePath);
	if(!fs.existsSync(pathname))
		pathname = getPthName('/index.html');
	return pathname;
}

function getLocalIP() {
	const interfaces = os.networkInterfaces();
	for (const interfaceName in interfaces) {
		const interface = interfaces[interfaceName];
		for (const iface of interface) {
			// skip over internal (non-IPv4) and non-external (e.g. VPN) addresses
			if (iface.family !== 'IPv4' || iface.internal !== false) continue;
			let locIP = `${iface.address}`;
			if (locIP.startsWith('192'))
				return locIP;
		}
	}
	
	// return null if no local IP address found
	return null;
}

// Creating a server and listening at port 80
http.createServer( (req, res) => {
	// Parsing the requested URL
	const parsedUrl = url.parse(req.url);
    const pth = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;

	/*
        Processing the requested file pathname to
        avoid directory traversal like,
        http://localhost:80/../fileOutofContext.txt
        by limiting to the current directory only.
    */

	let pathname = getPthName(pth);
	
	// Read file from file system limit to
	// the current directory only.
	fs.readFile(pathname, function(err, data) {
		if(err){
			res.statusCode = 500;
			res.end(`Error in getting the file.`);
		}
		else {				
			// Based on the URL path, extract the
			// file extension. Ex .js, .doc, ...
			const ext = path.parse(pathname).ext;

			// If the file is found, set Content-type
			// and send data
			res.setHeader('Content-type',
				mimeType[ext] || 'text/plain' );
			res.end(data);
		}
	});
}).listen(PORT, () => {
	myLocalIP = getLocalIP();
	console.log(`Server started successfully`);
	const lanIP = `http://${myLocalIP}:${PORT}`;
	console.log(`Listening locally at http://localhost:${PORT}`);
	myLocalIP && console.log(`Listening on LAN interface at ${lanIP}`);
	exec(`start msedge.exe --inprivate "${lanIP}"`);
});
