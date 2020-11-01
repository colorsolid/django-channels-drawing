
//----------------------------------------------------------------------------------------- >
// S O C K E T ---------------------------------------------------------------------------- >
//----------------------------------------------------------------------------------------- >

const _loc = window.location;

let _connection_id = null;

function start_socket(full_url=null, loc_rel=null) {
  let endpoint = '';
  if (full_url !== null) {
    endpoint = full_url;
  }
  else if (loc_rel !== null) {
    let ws_start = 'ws://';
    if (_loc.protocol === 'https:') {
      ws_start = 'wss://';
    }
    endpoint = ws_start + _loc.host + loc_rel;
  }
  let socket = new WebSocket(endpoint);

  socket.onopen = function(e) {
    initial = true;
    console.log('%c welcome ', 'background: #4444bb; color: #01fdfd;');
  };

  socket.onerror = function(e) {
    console.log('error', e);
  };

  socket.onclose = function(e) {
    console.log('%c goodbye ', 'background: #4444bb; color: #01fdfd;');
    _connection_id = null;
  };

  socket.onmessage = function(e) {
    let data = JSON.parse(e.data);
    handle_data(data);
  }
  return socket;
}

const _ticks_before_reconnect = 10;
let _ticks_disconnected = 0;

function on_interval() {}

function socket_interval() {
  if (_socket.readyState === 3) {
    _ticks_disconnected += 1;
    if (_ticks_disconnected >= _ticks_before_reconnect) {
      _socket = start_socket(_socket.url);
      _ticks_disconnected = 0;
    }
  }
  else {
    _ticks_disconnected = 0;
    on_interval();
  }
}
