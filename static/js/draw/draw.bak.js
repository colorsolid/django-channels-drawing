window.scrollTo(0, 0);

const main = document.getElementById('main');
const board = document.querySelector('.board-local');
//const board_remote = document.getElementById('board-remote');
const pos = document.getElementById('pos');
const board_wrapper = document.getElementById('board-wrapper');
const functions_bar = document.getElementById('functions-bar');

const color_btns = functions_bar.querySelectorAll('.btn-color');

//const user_id = Math.random().toString(36).substr(2);

var ctx = board.getContext('2d');
var remote_boards = {};
ctx.save();
ctx.lineWidth = 1;
//var ctx_remote = board_remote.getContext('2d');

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

function move_board(x_new, y_new) {
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

board.onmouseup = unclick;
board.onmouseout = unclick;
board.ontouchend = unclick;

function unclick() {
  if (clicked) {
    clicked = false;
    if (stroke.length) {
      stroke_arr.push(stroke);
      stroke = [];
    }
    x = -1;
    y = -1;
    x_grab = x;
    y_grab = y;
    if (move_enabled) {
      x_offset += x_diff;
      y_offset += y_diff;
      //x_offset += x_offset + x_diff > 0 ? -x_offset : x_diff;
      //y_offset += y_offset + y_diff > 0 ? -y_offset : y_diff;
    }
    if (stroke_chunk.length === 1) {
      stroke_chunk.length = [];
    }
    send_draw_data([stroke_chunk], 'save');
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
  for (let stroke of stroke_arr) {
    if (stroke) {
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
}

function draw_segments(drawing) {
  let _ctx;
  if (drawing.hash === user_id.substr(0, 12)) {
    _ctx = ctx;
  }
  else {
    let ctx_id = drawing.nickname + '!' + drawing.hash;
    if (drawing.hash === user_id.substr(0, 12)) {

    }
    if (!(ctx_id in remote_boards)) {
      remote_boards[ctx_id] = new_board(drawing.hash);
    }
     _ctx = remote_boards[ctx_id].ctx;
  }
  for (let segment of drawing['segments']) {
    draw_strokes([segment.coords], segment.color, _ctx);
  }
}

function new_board(hash) {
  let board = el(
    'canvas', '', 'board-remote', {height: '4096px', width: '4096px', 'id': 'board-' + hash}, board_wrapper
  );
  let ctx = board.getContext('2d');
  let dict = {
    board: board,
    ctx: ctx
  };
  return dict;
}
