window.scrollTo(0, 0);

const loc = window.location;

const main = document.getElementById('main');
const board = document.getElementById('board');
const board_remote = document.getElementById('board-remote');
const pos = document.getElementById('pos');
const board_wrapper = document.getElementById('board-wrapper');
const functions_bar = document.getElementById('functions-bar');

const color_btns = functions_bar.querySelectorAll('.btn-color');

var connection_id;

//const connection_id = Math.random().toString(36).substr(2);

var ctx = board.getContext('2d');
ctx.save();
ctx.lineWidth = 1;
var ctx_remote = board_remote.getContext('2d');

color_btns.forEach(btn => {
  btn.style.color = btn.dataset.color;
  btn.onclick = function() {
    color_btns.forEach(btn => {btn.classList.remove('btn-secondary');});
    this.classList.add('btn-secondary');
    ctx.restore();
    ctx.strokeStyle = this.dataset.color;
  }
});

var rect = board.getBoundingClientRect();

var draw_enabled = true;
var move_enabled = false;

board_wrapper.style.height = (window.innerHeight - board_wrapper.getBoundingClientRect().y) + 'px';
window.onresize = function() {
  board_wrapper.style.height = (window.innerHeight - board_wrapper.getBoundingClientRect().y) + 'px';
  rect = board.getBoundingClientRect();
}



//----------------------------------------------------------------------------------------- >
// M O U S E _ E V E N T S ---------------------------------------------------------------- >
//----------------------------------------------------------------------------------------- >


var stroke_arr = [];
var stroke = [];
var stroke_chunk = [];
var x = -1;
var y = -1;
var x_grab = x;
var y_grab = y;
var x_diff = 0;
var y_diff = 0;
var x_offset = 0;
var y_offset = 0;
var clicked = false;
var line_draw = false;

//board.addEventListener('mousedown', click);
board.onmousedown = click;
//board.addEventListener('touchstart', click);
board.ontouchstart = click;

function click(event) {
  event.preventDefault();
  clicked = true;
  if (move_enabled) {
    x_grab = (event.clientX || event.targetTouches[0].clientX) - rect.left;
    y_grab = (event.clientY || event.targetTouches[0].clientY) - rect.top;
  }
}

//board.addEventListener('mousemove', input_move);
board.onmousemove = input_move;
//board.addEventListener('touchmove', input_move);
board.ontouchmove = input_move;

function input_move(event) {
  let x_new = (event.clientX || event.targetTouches[0].clientX) - rect.left;
  let y_new = (event.clientY || event.targetTouches[0].clientY) - rect.top;
  pos.innerHTML = `(${Math.floor(x_new - x_offset)}, ${Math.floor(y_new - y_offset)})`;
  if (clicked) {
    if (draw_enabled) {
      stroke = [];
      draw_input(x_new, y_new);
    }
    if (move_enabled) {
      move_board(x_new, y_new);
    }
  }
}

function draw_input(x_new, y_new) {
  ctx.beginPath();
  if (x > -1 && y > -1) {
    ctx.moveTo(x, y);
    line_draw = true;
  }
  x = x_new - x_offset;
  y = y_new - y_offset;
  //ctx.fillRect(x, y, 10, 10);
  if (line_draw) {
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.closePath();
    line_draw = false;
  }
  stroke.push([x, y]);
  stroke_chunk.push([x, y]);
}

function move_board(x_new, y_new) {
  x_diff = x_new - x_grab;
  y_diff = y_new - y_grab;
  board_wrapper.style.marginLeft = (x_offset + x_diff > 0 ? 0 : x_offset + x_diff) + 'px';
  board_wrapper.style.marginTop = (y_offset + y_diff > 0 ? 0 : y_offset + y_diff) + 'px';
  functions_bar.style.marginTop = (-y_offset - y_diff > 0 ? -y_offset - y_diff : 0) + 'px';
}

board.onmouseup = unclick;
board.onmouseout = unclick;
board.ontouchend = unclick;

function unclick() {
  if (clicked) {
    clicked = false;
    if (stroke.length) {
      stroke_arr.push(stroke);
      send_data(stroke, 'save');
      stroke = [];
    }
    x = -1;
    y = -1;
    x_grab = x;
    y_grab = y;
    if (move_enabled) {
      x_offset += x_offset + x_diff > 0 ? -x_offset : x_diff;
      y_offset += y_offset + y_diff > 0 ? -y_offset : y_diff;
    }
    console.log('unclick', x_offset, y_offset)
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


var btn_move_toggle = document.getElementById('btn-move-toggle');
var btn_draw_toggle = document.getElementById('btn-draw-toggle');
var body_wrapper = document.getElementById('body-wrapper');

btn_move_toggle.onclick = toggle_modes;
btn_draw_toggle.onclick = toggle_modes;

function toggle_modes() {
  toggle_move_mode();
  toggle_draw_mode();
}

function toggle_move_mode() {
  let btn = btn_move_toggle;
  btn.dataset.move = (!(btn.dataset.move === 'true')).toString();
  btn.classList.toggle('btn-success');
  btn.classList.toggle('btn-dark');
  move_enabled = !move_enabled;
}

function toggle_draw_mode() {
  let btn = btn_draw_toggle;
  btn.dataset.draw = (!(btn.dataset.draw === 'true')).toString();
  btn.classList.toggle('btn-success');
  btn.classList.toggle('btn-dark');
  draw_enabled = !draw_enabled;
}



//----------------------------------------------------------------------------------------- >
// M I S C -------------------------------------------------------------------------------- >
//----------------------------------------------------------------------------------------- >


// a stroke is an array of [x, y] coordinate pairs,
// and stroke_arr is an array of strokes
function draw_strokes(stroke_arr, stroke_color, ctx) {
  console.log('drawing');
  for (let stroke of stroke_arr) {
    for (let i = 0; i < stroke.length - 1; i++) {
      ctx.strokeStyle = stroke_color;
      ctx.beginPath();
      let a = stroke[i];
      let b = stroke[i + 1];
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.closePath();
    }
  }
}



//----------------------------------------------------------------------------------------- >
// S O C K E T ---------------------------------------------------------------------------- >
//----------------------------------------------------------------------------------------- >


function start_socket() {
  let ws_start = 'ws://';
  if (loc.protocol == 'https:') {
    ws_start = 'wss://';
  }
  let endpoint = ws_start + loc.host + '/ws/draw/' + room_name + '/';
  let socket = new WebSocket(endpoint);

  socket.onopen = function(e) {
    console.log('open');
  };

  socket.onerror = function(e) {
    console.log('error', e);
  };

  socket.onclose = function(e) {
    console.log('closed');
  };

  socket.onmessage = function(e) {
    console.log('message', e);
    let data = JSON.parse(e.data);
    console.log(data);
    if (data.new_id) connection_id = data.new_id;
    if (data.connection_id !== connection_id) {
      if (data.stroke_arr) {
        draw_strokes(data.stroke_arr, data.stroke_color, ctx_remote);
      }
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

function send_data(arr, type='draw') {
  socket.send(JSON.stringify({
      type: type,
      connection_id: connection_id,
      stroke_arr: arr,
      stroke_color: ctx.strokeStyle
  }));
}

send_timer = setInterval(socket_interval, 500);
