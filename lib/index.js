var net = require('net'),
    util = require('util');

function SOCKS(options, callback) {
  if (!(this instanceof SOCKS)) return new SOCKS(options, callback);

  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (!callback) {
    throw new Error('Must provide a data callback!');
  }

  options = options || {};
  this.handler = options.handler || this.handler;
  this.debug = !!((process.env.SOCKS_DEBUG &&
                  process.env.SOCKS_DEBUG.toLowerCase() === 'true') ||
                  options.debug &&
                  true);

  net.Server.call(this, function (client) {
    var self = this,
        address = client.address = {
          ip: client.remoteAddress,
          port: client.remotePort
        };

    this.log('Client from %s connected on port %d', address.ip, address.port);

    client.on('data', function (chunk) {
      self.log('Received data from %s on port %d', address.ip, address.port);

      self.handler.call(self, client, chunk, callback);
    });

    client.on('end', function () {
      self.log('Client from %s disconnected on port %d', address.ip, address.port);
    })
  });

  return this;
}

util.inherits(SOCKS, net.Server);

SOCKS.prototype.log = function (message) {
  if (this.debug) {
    message = util.format.apply(null, [ message ].concat([].slice.call(arguments, 1)));
    console.log('SOCKS: %s', message);
  }
};

SOCKS.prototype.handler = function (client, chunk, fn) {
  // Expect client initialization packet if not already initialized.
  if (!client.initialized) {
    if (chunk[0] === 0x04) {
      if (chunk[1] === 0x01 && chunk[2] === 0x00 && chunk[chunk.length - 1] === 0x00) {
        // SOCKS4a CONNECT
        if (chunk.length >= 10) {
          this.log('Got SOCKS4a CONNECT from %s on port %d', client.address.ip, client.address.port);

          client.target = {
            port: chunk[3]
          };

          // IP should be invalid, as per protocol standards.
          if (!~[].slice.call(chunk, 4, 8).map(function (octet, id) {
            if (id < 3) {
              return octet === 0x00;
            }
            return octet !== 0x00;
          }).indexOf(false)) {
            var self = this,
                user = chunk.slice(8, [].slice.call(chunk, 8).indexOf(0x00) + 8).toString('utf8');
            if (user) client.target.user = user;
            client.target.domain = chunk.slice(9, -1).toString('utf8');
            client.initialized = true;
            return client.write('005a000000000000', 'hex');
          }
        }

        // SOCKS4 CONNECT
        if (chunk.length >= 9) {
          if (chunk[1] === 0x01 && chunk[2] === 0x00) {
            this.log('Got SOCKS4 CONNECT from %s on port %d', client.address.ip, client.address.port);
            client.target = {
              port: chunk[3],
              ip: [].slice.call(chunk, 4, -1).join('.')
            };
            client.initialized = true;
            return client.write('005a000000000000', 'hex');
          }
        }
      }
      else if (chunk[1] === 0x02) {
        this.log('SOCKS4/4a BIND requested, but not supported.');
      }
      else {
        this.log('Malformed SOCKS4/4a CONNECT data.');
      }

      return client.end('005b000000000000', 'hex');
    }

    // SOCKS5 CONNECT
    else if (chunk[0] === 0x05) {
      // SOCKS5 expects authorization as the first packet instead of CONNECT.
      // Let's make sure it's authorized here.
      if (!client.authorized) {
        this.log('Got SOCKS5 AUTH from %s on port %d', client.address.ip, client.address.port);
        // No authorization supported right now. Let's just auth and send back
        // an accepted response.
        client.authorized = true;
        return client.write('0500', 'hex');
      }

      if (chunk[1] === 0x01 && chunk[2] === 0x00 && chunk[chunk.length - 2] === 0x00) {
        this.log('Got SOCKS5 CONNECT from %s on port %d', client.address.ip, client.address.port);
        
        client.target = {
          port: chunk[chunk.length - 1]
        };

        switch (chunk[3]) {
          // IPv4 and IPv6
          case 0x01:
          case 0x04:
            client.target.ip = [].slice.call(chunk, 4, -2).join('.');
            break;

          // Domain
          case 0x03:
            client.target.domain = [].slice.call(chunk, 5, -2).join('');
            break;
        }

        client.initialized = true;
        return client.write('050000' + chunk.slice(3).toString('hex'), 'hex');
      }
      else if (chunk[1] === 0x01) {
        this.log('SOCKS5 BIND requested, but not supported.');
      }
      else if (chunk[1] === 0x02) {
        this.log('SOCKS5 UDP requested, but not supported.');
      }
      else {
        this.log('Malformed SOCKS5 CONNECT data from %s on port %d', client.address.ip, client.address.port);
      }

      return client.end('050100' + chunk.slice(3).toString('hex'), 'hex');
    }
  }

  // Data pass through
  fn.call(client, chunk);
};

module.exports = SOCKS;
