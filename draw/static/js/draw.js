//----------------------------------------------------------------------------------------- >
// M O U S E _ E V E N T S ---------------------------------------------------------------- >
//----------------------------------------------------------------------------------------- >


let _stroke_arr = [];
let _stroke = [];
let _stroke_chunk = [];

let _zoom_ratio = 1;

// mouse coordinates
let _x = -1;
let _y = -1;

// grab coordinates when moving the drawing board
let _x_grab = -1;
let _y_grab = -1;

// difference between current mouse coordinates and grab coordinates
let _x_diff = 0;
let _y_diff = 0;

// scroll position
let _x_offset = Math.round(-2048 + (window.innerWidth / 2));
let _y_offset = Math.round(-2048 + (window.innerHeight / 2));

let _mode = null;

function center_board() {
  _x_offset = Math.round(-((4096 / 2) * _zoom_ratio) + (window.innerWidth / 2)) / _zoom_ratio;
  _y_offset = Math.round(-((4096 / 2) * _zoom_ratio) + (window.innerHeight / 2)) / _zoom_ratio;
  move_board(0, 0)
}

function set_mode() {
  let mode = _board_options.value;
  if (_mode !== mode) {
    _mode = mode;
    if (mode === 'draw') {
      _board_wrapper.style.cursor = 'crosshair';
      _draw_enabled = true;
      _move_enabled = false;
    }
    if (mode === 'move') {
      _board_wrapper.style.cursor = 'grab';
      _draw_enabled = false;
      _move_enabled = true;
    }
  }
}

let _clicked = false;

_board_wrapper.onmousedown = click;
_board_wrapper.ontouchstart = click;

let _temp_move_enabled = false;

function click(event) {
  event.preventDefault();
  if (event.buttons !== undefined) {
    if (event.buttons === 2) {
      _temp_move_enabled = true;
      _draw_enabled = false;
    }
  }
  if (event.targetTouches !== undefined) {
    /*
    if (event.targetTouches.length > 1) {
      _temp_move_enabled = true;
      _draw_enabled = false;
    }
    */
  }

  _drawing.thickness = parseInt(_brush_size_select.value);
  _clicked = true;
  if (_move_enabled || _temp_move_enabled) {
    _board_wrapper.style.cursor = 'grabbing';
    _x_grab = (event.clientX || event.targetTouches[0].clientX);
    _y_grab = (event.clientY || event.targetTouches[0].clientY);
  }
}

_board_wrapper.onmousemove = input_move;
_board_wrapper.ontouchmove = input_move;

const _pos_x = $('#pos-x');
const _pos_y = $('#pos-y');

function autohide_side_bar_lower(visible=false) {
  if (_side_bar_lower.dataset.visible === 'true') {
    toggle_side_bar_lower(visible);
  }
}

function input_move(event) {
  set_mode();
  let mid_width = _board.offsetWidth / 2;
  try {
    let x_new = (event.clientX || event.targetTouches[0].clientX);
    let y_new = (event.clientY || event.targetTouches[0].clientY);
    if (_x_grab === -1 && _y_grab === -1) {
      _pos_x.innerHTML = Math.floor((x_new - _x_offset - mid_width));
      _pos_y.innerHTML = -Math.floor((y_new - _y_offset - mid_width));
    }
    else {
      _pos_x.innerHTML = Math.floor((_x_grab - _x_offset - mid_width));
      _pos_y.innerHTML = -Math.floor((_y_grab - _y_offset - mid_width));
    }
    if (_clicked) {
      _side_bar.classList.add('side-bar-behind');
      autohide_side_bar_lower();
      if (_draw_enabled && _board.style.display !== 'none') {
        draw_input(x_new / _zoom_ratio, y_new / _zoom_ratio);
        _board_separator.classList.add('board-separator-opaque');
        _btn_redo.disabled = true;
      }
      if (_move_enabled || _temp_move_enabled) move_board(x_new, y_new);
    }
  }
  catch (e) {}
}

function move_board(x_new, y_new) {
  _x_diff = (x_new - _x_grab) / _zoom_ratio;
  _y_diff = (y_new - _y_grab) / _zoom_ratio;
  let margin_x = (_x_offset + _x_diff) * _zoom_ratio;
  let margin_y = (_y_offset + _y_diff) * _zoom_ratio;
  _board_wrapper.style.marginLeft = margin_x + 'px';
  _board_wrapper.style.marginTop = margin_y + 'px';
  _side_bar.style.marginTop = -margin_y + 'px';
}


_board_wrapper.onmouseup = unclick;
_board_wrapper.onmouseout = unclick;
_board_wrapper.ontouchend = unclick;


function zoom(btn) {
  btn.blur();
  let boards = $$('.board');
  if (_zoom_ratio === 1) _zoom_ratio = 0.75;
  else if (_zoom_ratio === 0.75) _zoom_ratio = 0.5;
  else if (_zoom_ratio === 0.5) _zoom_ratio = 0.25;
  else _zoom_ratio = 1;
  let percentage_text = (_zoom_ratio * 100) + '%';
  let pixel_text = (_zoom_ratio * 4096) + 'px';
  $('#zoom-btn').innerText = 'zoom ' + percentage_text;
  for (let board of boards) {
    board.style.width = pixel_text;
    board.style.height = pixel_text;
  }
  let old_size_class = _board_wrapper.className.match(/board\-\d+/);
  let new_size_class = 'board-' + (_zoom_ratio * 100);
  _board_wrapper.className = _board_wrapper.className.replace(old_size_class, new_size_class);
  center_board();
}


function unclick(event) {
  setTimeout(function() {
    if (_clicked) {
      _side_bar.classList.remove('side-bar-behind');
      autohide_side_bar_lower(visible=true)
      _board_separator.classList.remove('board-separator-opaque');
      _clicked = false;
      if (_stroke.length) {
        _btn_clear.disabled = false;
        _btn_undo.disabled = false;
        let stroke_data = {
          color: _ctx.strokeStyle,
          coords: _stroke,
          thickness: _ctx.lineWidth
        };
        trim_segments();
        _drawing.segments.push(stroke_data);
        _drawing.end_index = _drawing.segments.length - 1;
        _stroke_arr.push(_stroke);
        _stroke = [];
        fill_endpoint(_ctx, _x, _y, _drawing.thickness, _drawing.color);
      }
      _x = -1;
      _y = -1;
      _x_grab = -1;
      _y_grab = -1;
      if (_move_enabled || _temp_move_enabled) {
        _board_wrapper.style.cursor = 'grab';
        _x_offset += _x_diff;
        _y_offset += _y_diff;
        _x_diff = 0;
        _y_diff = 0;
      }
      if (_stroke_chunk.length) send_draw_data([_stroke_chunk], 'save');
      _stroke_chunk = [];
      if (_temp_move_enabled) {
        _temp_move_enabled = false;
        if (_move_enabled) _board_wrapper.style.cursor = 'grab';
        else {
          _draw_enabled = true;
          _board_wrapper.style.cursor = 'crosshair';
        }
      }
    }
  }, 50);
}


function trim_segments() {
  if (_drawing.segments.length - 1 > _drawing.end_index) {
    _drawing.segments = _drawing.segments.slice(0, _drawing.end_index + 1);
  }
}


//----------------------------------------------------------------------------------------- >
// B U T T O N _ E V E N T S -------------------------------------------------------------- >
//----------------------------------------------------------------------------------------- >

const _body_wrapper = $('#body-wrapper');

_btn_undo.onclick = function() {
  this.blur();
  let segments = null;
  if (_drawing.end_index > -1) {
    _drawing.end_index -= 1;
    segments = process_drawing_data(_drawing, draw=true);
    _ctx.strokeStyle = _drawing.color;
    _btn_redo.disabled = false;
    update_btn_clear_status(segments, end_index=_drawing.end_index);
  }
  if (_drawing.end_index <= -1) this.disabled = true;
  send_draw_data(segments, 'undo');
}


_btn_redo.onclick = function() {
  this.blur();
  let segments = null;
  if (_drawing.end_index >= _drawing.segments.length - 2) {
    this.disabled = true;
  }
  if (_drawing.end_index < _drawing.segments.length - 1) {
    _drawing.end_index += 1;
    segments = process_drawing_data(_drawing, draw=true);
    _btn_undo.disabled = false;
    update_btn_clear_status(segments);
  }
  send_draw_data(segments, 'redo');
}


_btn_clear.onclick = function() {
  this.blur();
  trim_segments();
  _drawing.segments.push('CLEAR');
  _drawing.end_index += 1;
  _ctx.clearRect(0, 0, _board.width, _board.height);
  send_draw_data(null, 'clear');
  this.disabled = true;
  _btn_redo.disabled = true;
}


//----------------------------------------------------------------------------------------- >
// D R A W -------------------------------------------------------------------------------- >
//----------------------------------------------------------------------------------------- >


function draw_input(x_rel, y_rel) {
  let x1 = _x;
  let y1 = _y;
  let x2 = x_rel - _x_offset;
  let y2 = y_rel - _y_offset;
  _x = x2;
  _y = y2;
  if (x1 > -1 && y1 > -1) {
    draw_line(_ctx, x1, y1, x2, y2, _drawing.thickness, _drawing.color);
    fill_endpoint(_ctx, x1, y1, _drawing.thickness, _drawing.color);
  }
  _stroke.push([x2, y2]);
  _stroke_chunk.push([x2, y2]);
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


center_board();

draw_line(_overlay_ctx, 0, 2048, 4096, 2048, 1, '#000000');
draw_line(_overlay_ctx, 2048, 0, 2048, 4096, 1, '#000000');

_board_wrapper.addEventListener('contextmenu', e => {e.preventDefault();});

function on_interval() {
  send_chunk();
}

let loc_rel = '/ws/draw/' + _room_name + '/'
let _socket = start_socket(null, loc_rel);
const send_timer = setInterval(socket_interval, 500);
