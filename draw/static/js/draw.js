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

board_wrapper.onmousedown = click;
board_wrapper.ontouchstart = click;

function click(event) {
  _drawing.thickness = brush_size_select.value;
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
  else pos.innerHTML = `(${Math.floor(x_grab - x_offset - 2048)}, ${-Math.floor(y_grab - y_offset - 2048)})`;
  if (clicked) {
    if (draw_enabled && board.style.display !== 'none') {
      draw_input(x_new, y_new);
      btn_redo.disabled = true;
    }
    if (move_enabled) move_board(x_new, y_new);
  }
}


function move_board(x_new=0, y_new=0) {
  x_diff = x_new - x_grab;
  y_diff = y_new - y_grab;
  let margin_x = x_offset + x_diff;
  let margin_y = y_offset + y_diff;
  board_wrapper.style.marginLeft = margin_x + 'px';
  board_wrapper.style.marginTop = margin_y + 'px';
  functions_bar.style.marginTop = -margin_y + 'px';
}


board_wrapper.onmouseup = unclick;
board_wrapper.onmouseout = unclick;
board_wrapper.ontouchend = unclick;


function unclick() {
  if (clicked) {
    clicked = false;
    if (stroke.length) {
      btn_clear.disabled = false;
      btn_undo.disabled = false;
      let stroke_data = {
        color: ctx.strokeStyle,
        coords: stroke,
        thickness: ctx.lineWidth
      };
      trim_segments();
      _drawing.segments.push(stroke_data);
      _drawing.end_index = _drawing.segments.length - 1;
      stroke_arr.push(stroke);
      stroke = [];
      fill_endpoint(ctx, x, y, _drawing.thickness, _drawing.color);
    }
    x = -1;
    y = -1;
    x_grab = x;
    y_grab = y;
    if (move_enabled) {
      board_wrapper.style.cursor = 'grab';
      x_offset += x_diff;
      y_offset += y_diff;
    }
    if (stroke_chunk.length) send_draw_data([stroke_chunk], 'save');
    stroke_chunk = [];
  }
}


function trim_segments() {
  if (_drawing.segments.length - 1 > _drawing.end_index) {
    _drawing.segments = _drawing.segments.slice(0, _drawing.end_index + 1);
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
    let mode_is_selected = (!(btn.dataset[prop] === 'true'));
    btn.dataset[prop] = mode_is_selected.toString();
    if (mode_is_selected) board_wrapper.style.cursor = cursor;
    btn.classList.toggle('btn-success');
    btn.classList.toggle('btn-dark');
  }
  move_enabled = (btn_move_toggle.dataset.move === 'true');
  draw_enabled = (btn_draw_toggle.dataset.draw === 'true');
}


btn_undo.onclick = function() {
  let segments = null;
  if (_drawing.end_index > -1) {
    _drawing.end_index -= 1;
    segments = process_drawing_data(_drawing, draw=true);
    ctx.strokeStyle = _drawing.color;
    btn_redo.disabled = false;
    update_btn_clear_status(segments, end_index=_drawing.end_index);
  }
  if (_drawing.end_index <= -1) this.disabled = true;
  send_draw_data(segments, 'undo');
}


btn_redo.onclick = function() {
  let segments = null;
  if (_drawing.end_index >= _drawing.segments.length - 2) {
    this.disabled = true;
  }
  if (_drawing.end_index < _drawing.segments.length - 1) {
    _drawing.end_index += 1;
    segments = process_drawing_data(_drawing, draw=true);
    btn_undo.disabled = false;
    update_btn_clear_status(segments);
  }
  send_draw_data(segments, 'redo');
}


btn_clear.onclick = function() {
  trim_segments();
  _drawing.segments.push('CLEAR');
  _drawing.end_index += 1;
  ctx.clearRect(0, 0, board.width, board.height);
  send_draw_data(null, 'clear');
  this.disabled = true;
  btn_redo.disabled = true;
}


//----------------------------------------------------------------------------------------- >
// D R A W -------------------------------------------------------------------------------- >
//----------------------------------------------------------------------------------------- >


function draw_input(x_rel, y_rel) {
  let x1 = x;
  let y1 = y;
  let x2 = x_rel - x_offset;
  let y2 = y_rel - y_offset;
  x = x2;
  y = y2;
  if (x1 > -1 && y1 > -1) {
    draw_line(ctx, x1, y1, x2, y2, _drawing.thickness, _drawing.color);
    fill_endpoint(ctx, x1, y1, _drawing.thickness, _drawing.color);
    stroke.push([x2, y2]);
    stroke_chunk.push([x2, y2]);
  }
}


function draw_strokes(stroke_arr, stroke_color, segment_thickness, ctx) {
  for (let stroke of stroke_arr) {
    let x1, y1, x2, y2;
    for (let i = 0; i < stroke.length - 1; i++) {
      [x1, y1] = stroke[i];
      [x2, y2] = stroke[i + 1];
      draw_line(ctx, x1, y1, x2, y2, segment_thickness, stroke_color);
      fill_endpoint(ctx, x1, y1, segment_thickness, stroke_color);
    }
    fill_endpoint(ctx, x2, y2, segment_thickness, stroke_color);
  }
}


function draw_line(ctx, x1, y1, x2, y2, thickness, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
}


function fill_endpoint(ctx, x1, y1, thickness, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x1, y1, thickness / 2, 0, Math.PI * 2, false);
  ctx.fill();
  ctx.closePath();
}


move_board();
