window.onload = function() {
  window.scrollTo(0, 0);
}


const main = document.getElementById('main');
const board = document.querySelector('.board-local');
const pos = document.getElementById('pos');
const board_wrapper = document.getElementById('board-wrapper');
board_wrapper !== 'bored_rapper';
const functions_bar = document.getElementById('functions-bar');

const color_btns = functions_bar.querySelectorAll('.btn-color');

var ctx = board.getContext('2d');
var remote_boards = {};
ctx.save();
ctx.lineWidth = 1;

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

var draw_enabled = false;
var move_enabled = true;

board_wrapper.style.cursor = 'grab';

board_wrapper.style.height = (window.innerHeight) + 'px';
window.onresize = function() {
  board_wrapper.style.height = (window.innerHeight) + 'px';
  rect = board.getBoundingClientRect();
}



//----------------------------------------------------------------------------------------- >
// M O U S E _ E V E N T S ---------------------------------------------------------------- >
//----------------------------------------------------------------------------------------- >


var stroke_arr = [];
var stroke = [];
var stroke_chunk = [];


// mouse coordinates
var x = -1;
var y = -1;

// grab coordinates when moving the drawing board
var x_grab = x;
var y_grab = y;

// difference between current mouse coordinates and grab coordinates
var x_diff = 0;
var y_diff = 0;

// scroll position
var x_offset = Math.round(-2048 + (window.innerWidth / 2));
var y_offset = Math.round(-2048 + (window.innerHeight / 2));

var clicked = false;
var line_draw = false;

board_wrapper.onmousedown = click;
board_wrapper.ontouchstart = click;

function click(event) {
  event.preventDefault();
  clicked = true;
  if (move_enabled) {
    board_wrapper.style.cursor = 'grabbing';
    x_grab = (event.clientX || event.targetTouches[0].clientX);
    y_grab = (event.clientY || event.targetTouches[0].clientY);
  }
}

board_wrapper.onmousemove = input_move;
board_wrapper.ontouchmove = input_move;

function input_move(event) {
  let x_new = (event.clientX || event.targetTouches[0].clientX);
  let y_new = (event.clientY || event.targetTouches[0].clientY);
  if (x_grab === -1 && y_grab === -1) {
    pos.innerHTML = `(${Math.floor(x_new - x_offset - 2048)}, ${-Math.floor(y_new - y_offset - 2048)})`;
  }
  else {
    pos.innerHTML = `(${Math.floor(x_grab - x_offset - 2048)}, ${-Math.floor(y_grab - y_offset - 2048)})`;
  }
  if (clicked) {
    if (draw_enabled && board.style.display !== 'none') {
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
  }
  stroke.push([x, y]);
  stroke_chunk.push([x, y]);
}

function move_board(x_new=0, y_new=0) {
  x_diff = x_new - x_grab;
  y_diff = y_new - y_grab;
  let margin_x = x_offset + x_diff;
  let margin_y = y_offset + y_diff;
  board_wrapper.style.marginLeft = margin_x + 'px';
  board_wrapper.style.marginTop = margin_y + 'px';
  functions_bar.style.marginTop = -margin_y + 'px';
  //board_wrapper.style.marginLeft = (x_offset + x_diff > 0 ? 0 : x_offset + x_diff) + 'px';
  //board_wrapper.style.marginTop = (y_offset + y_diff > 0 ? 0 : y_offset + y_diff) + 'px';
  //functions_bar.style.marginTop = (-y_offset - y_diff > 0 ? -y_offset - y_diff : 0) + 'px';
}

board_wrapper.onmouseup = unclick;
board_wrapper.onmouseout = unclick;
board_wrapper.ontouchend = unclick;

function unclick() {
  if (clicked) {
    clicked = false;
    if (stroke.length) {
      let stroke_data = {
        color: ctx.strokeStyle,
        coords: stroke,
        thickness: ctx.lineWidth
      };
      if (_drawing.segments.length - 1 > _drawing.end_index) {
        _drawing.segments = _drawing.segments.slice(0, _drawing.end_index + 1);
      }
      _drawing.segments.push(stroke_data);
      _drawing.end_index += 1;
      stroke_arr.push(stroke);
      stroke = [];
    }
    x = -1;
    y = -1;
    x_grab = x;
    y_grab = y;
    if (move_enabled) {
      board_wrapper.style.cursor = 'grab';
      x_offset += x_diff;
      y_offset += y_diff;
      //x_offset += x_offset + x_diff > 0 ? -x_offset : x_diff;
      //y_offset += y_offset + y_diff > 0 ? -y_offset : y_diff;
    }
    if (stroke_chunk.length) {
      send_draw_data([stroke_chunk], 'save');
    }
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
  let btns = [
    [btn_move_toggle, 'move', 'grab'],
    [btn_draw_toggle, 'draw', 'crosshair']
  ];
  for (let group of btns) {
    let [btn, prop, cursor] = group;
    let bool = (!(btn.dataset[prop] === 'true'));
    btn.dataset[prop] = bool.toString();
    if (bool) board_wrapper.style.cursor = cursor;
    btn.classList.toggle('btn-success');
    btn.classList.toggle('btn-dark');
  }
  move_enabled = (btn_move_toggle.dataset.move === 'true');
  draw_enabled = (btn_draw_toggle.dataset.draw === 'true');
}

var btn_undo = document.getElementById('btn-undo');
btn_undo.onclick = function() {
  let segments = null;
  if (_drawing.end_index > -1) {
    _drawing.end_index -= 1;
    segments = draw_segments(_drawing);
  }
  send_draw_data(segments, 'undo');
}

var btn_redo = document.getElementById('btn-redo');
btn_redo.onclick = function() {
  let segments = null;
  if (_drawing.end_index < _drawing.segments.length - 1) {
    _drawing.end_index += 1;
    segments = draw_segments(_drawing);
  }
  send_draw_data(segments, 'redo');
}

var btn_clear = document.getElementById('btn-clear');
btn_clear.onclick = function() {
  _drawing.segments.push('CLEAR');
  _drawing.end_index += 1;
  ctx.clearRect(0, 0, board.width, board.height);
  send_draw_data(null, 'clear');
}


//----------------------------------------------------------------------------------------- >
// D R A W -------------------------------------------------------------------------------- >
//----------------------------------------------------------------------------------------- >


// a stroke is an array of [x, y] coordinate pairs,
// and stroke_arr is an array of strokes
function draw_strokes(stroke_arr, stroke_color, ctx) {
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


function draw_segments(drawing) {
  console.log(drawing);
  let _ctx;
  let segments = drawing.segments;
  if (drawing.hash === user_id.substr(0, 12)) _ctx = ctx;
  else {
    let ctx_id = create_board(drawing.nickname, drawing.hash);
    _ctx = remote_boards[ctx_id].ctx;
  }
  _ctx.clearRect(0, 0, board.width, board.height);
  if (drawing.end_index !== undefined) {
    segments = segments.slice(0, drawing.end_index + 1);
    let start_index = segments.lastIndexOf('CLEAR');
    if (start_index > 0) {
      segments = segments.slice(start_index);
    }
  }
  if (drawing.redraw) {
    _ctx.clearRect(0, 0, board.width, board.height);
  }
  for (let segment of segments) {
    if (segment !== 'CLEAR') {
      draw_strokes([segment.coords], segment.color, _ctx);
    }
  }
  return segments;
}


move_board();
