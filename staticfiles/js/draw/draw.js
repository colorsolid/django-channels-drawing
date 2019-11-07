const loc = window.location;

const board = document.querySelector('#board');
const rect = board.getBoundingClientRect();
var ctx = board.getContext('2d');

const connection_id = Math.random().toString(36).slice(2);

var size = {
  width: window.innerWidth || document.body.clientWidth,
  height: window.innerHeight || document.body.clientHeight
};


// a stroke is an array of [x, y] coordinate pairs,
// and stroke_arr is an array of strokes
function draw_strokes(stroke_arr) {
  console.log('drawing');
  for (let stroke of stroke_arr) {
    for (let i = 0; i < stroke.length - 1; i++) {
      ctx.beginPath();
      let a = stroke[i];
      let b = stroke[i + 1];
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
}


//----------------------------------------------------------------------------------------- >
// M O U S E _ E V E N T S ---------------------------------------------------------------- >
//----------------------------------------------------------------------------------------- >

var stroke = [];
var stroke_chunk = [];
var stroke_arr = [];
var x = -1;
var y = -1;
var clicked = false;
var line_draw = false;

board.onmousemove = function(event) {
  let x_display = event.clientX - rect.left;
  let y_display = event.clientY - rect.top;
  document.querySelector('#pos').innerHTML = `(${x_display}, ${y_display})`;
  if (clicked) {
    if (x > -1 && y > -1) {
      ctx.moveTo(x, y);
      line_draw = true;
    }
    x = event.clientX - rect.left;
    y = event.clientY - rect.top;
    //ctx.fillRect(x, y, 10, 10);
    if (line_draw) {
      ctx.lineTo(x, y);
      ctx.stroke();
      line_draw = false;
    }
    stroke.push([x, y]);
    stroke_chunk.push([x, y]);
  }
}

board.onmousedown = function() {
  clicked = true;
  stroke = [];
}
board.onmouseup = unclick;
board.onmouseout = unclick;

document.body.ondblclick = function() {
  console.log(stroke_arr);
}

function unclick() {
  if (clicked) {
    clicked = false;
    if (stroke.length) {
      stroke_arr.push(stroke);
      stroke = [];
    }
    x = -1;
    y = -1;
    if (stroke_chunk.length === 1) {
      stroke_chunk.length = [];
    }
    if (stroke_chunk.length > 1) send_data([stroke_chunk]);
    stroke_chunk = [];
  }
}



//----------------------------------------------------------------------------------------- >
// B U T T O N _ E V E N T S -------------------------------------------------------------- >
//----------------------------------------------------------------------------------------- >

document.getElementById('btn-clear').onclick = function() {
  ctx.clearRect(0, 0, board.width, board.height);
  ctx = board.getContext('2d');
}

document.getElementById('btn-redo').onclick = function() {
  draw_strokes(stroke_arr, ctx);
}



//----------------------------------------------------------------------------------------- >
// S O C K E T ---------------------------------------------------------------------------- >
//----------------------------------------------------------------------------------------- >


function start_socket() {
  let ws_start = 'ws://';
  if (loc.protocol == 'https:') {
    ws_start = 'wss://';
  }
  let endpoint = ws_start + loc.host + loc.pathname + 'ws';
  let socket = new WebSocket(endpoint);

  socket.onopen = function() {
    console.log('open');
  };

  socket.onerror = function(e) {
    console.log('error', e);
  };

  socket.onclose = function(e) {
    console.log('closed');
  };

  socket.onmessage = function(e) {
    let data = JSON.parse(e.data);
    console.log(data.connection_id, connection_id);
    if (data.connection_id !== connection_id) {
      console.log('drawing from socket');
      draw_strokes(data.stroke_arr, ctx);
    }
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
      send_data([stroke_chunk]);
      stroke_chunk = [stroke_chunk[stroke_chunk.length - 1]];
    }
  }
}

function send_data(arr) {
  socket.send(JSON.stringify({
      'type': 'draw',
      'connection_id': connection_id,
      'stroke_arr': arr
  }));
}

send_timer = setInterval(socket_interval, 500);
