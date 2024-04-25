![socket_server](https://github.com/danzen/zim-socket-server/assets/380281/a26f98b5-bb81-4938-ad27-a20c8b376df4)

ZIM Socket Server is a multiuser server for the ZIM JavaScript Canvas Framework at https://zimjs.com.  The server works with <a href=https://zimjs.com/socket target=s>ZIM&nbsp;Socket</a> available on NPM at <a href=https://www.npmjs.com/package/@zimjs/socket target=s2>@zimjs/socket</a>.

<h2>NPM</h2>
<p>This repository holds the NPM package so you can install from <a href=https://www.npmjs.com/package/@zimjs/socket-server target=node>@zimjs/socket-server</a> on NPM.</p>

<p>There is a test index.html file in the public directory.  To run this follow these instructions:</p>

```JavaScript
// Go to the index.js and uncomment the app.use(express.static('public'))
// In the terminal (CTRL `), run the app using: npm run or node index
// Then view the index.html file at http://localhost:7010/ 
// open up another tab at http://localhost:7010/
// press somewhere on the stage and the circle on both pages will go there 
```

<h2>CLIENT</h2>
<p>The example calls the zim_socket2 ES6 module for the client.  You can also get the client from NPM at <a href=https://www.npmjs.com/package/@zimjs/socket target=s2>@zimjs/socket</a> and install this with one of the <a href=https://github.com/danzen/zimjs-templates target=nt>ZIM&nbsp;Node&nbsp;Templates</a></p>

<h2>ZIM</h2>
<p>See the ZIM repository at https://github.com/danzen/zimjs for information on ZIM and open source license, etc.</p>


