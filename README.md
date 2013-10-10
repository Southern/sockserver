# SOCK Server

**Warning:** This module is still under development and may have unanticipated
bugs. Please report any bugs that you may find in the [issues](https://github.com/Southern/sockserver).

This module is a SOCKS4/4a/5 server that will all operate on one port. Currently,
it doesn't have a way to disable certain protocols. That is coming with future
releases.


## Known issues
- Currently no way to disable a single protocol. All will be active on the same port.


## Example
This is a simple proxy example using the SOCKS server:
```js
var socks = require('sockserver'),
    net = require('net');

function handler(data) {
  var self = this,
      socket = net.connect(
        this.target.port,
        this.target.ip || this.target.domain,
        function () {
          this.write(data);
        }
      );

  socket.setEncoding('utf8');
  socket.on('data', function (chunk) {
    self.write(chunk);
  });
}

var server = socks(handler);

server.listen(8000, function () {
  console.log('Listening on port %d', server.address().port);
});
```

## License
Copyright (c) 2013 Colton Baker

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
