
//----------------------------------------------------------------------------------------- >
// S O C K E T ---------------------------------------------------------------------------- >
//----------------------------------------------------------------------------------------- >

const loc = window.location;

var connection_id = null;

function start_socket() {
  let ws_start = 'ws://';
  if (loc.protocol == 'https:') {
    ws_start = 'wss://';
  }
  let endpoint = ws_start + loc.host + '/ws/draw/' + room_name + '/';
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
    connection_id = null;
  };

  socket.onmessage = function(e) {
    let data = JSON.parse(e.data);
    parse_data(data);
  }
  return socket;
}

let socket = start_socket();

const ticks_before_reconnect = 10;
let ticks_disconnected = 0;

function socket_interval() {
  if (socket.readyState === 3) {
    disconnected_ticks += 1;
    if (disconnected_ticks >= ticks_before_reconnect) {
      socket = start_socket();
      disconnected_ticks = 0;
    }
  }
  else {
    disconnected_ticks = 0;
    if (stroke_chunk.length > 1) {
      send_draw_data([stroke_chunk]);
      stroke_chunk = [stroke_chunk[stroke_chunk.length - 1]];
    }
    else if (stroke_chunk.length === 1 && stroke_chunk[0] === 'clear') {
      send_draw_data([stroke_chunk]);
      stroke_chunk = [];
    }
  }
}

function send_draw_data(arr, type='draw') {
  socket.send(JSON.stringify({
      type: type,
      stroke_arr: arr,
      stroke_color: ctx.strokeStyle,
      stroke_width: ctx.lineWidth
  }));
}

send_timer = setInterval(socket_interval, 500);
