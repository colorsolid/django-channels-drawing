window.onload = function() {
  window.scrollTo(0, 0);
}

let _drawing = {
  segments: [],
  end_index: -1,
  color: '#00ff00',
  thickness: 3,
  drawing_group: '* * M A I N * *',
  hash: _user_hash,
  nickname: _nickname
};

const $ = function(selector, parent) {
    return (parent ? parent : document).querySelector(selector);
};

const $$ = function(selector, parent) {
    return [].slice.call((parent ? parent : document).querySelectorAll(selector));
};

const _board_wrapper = $('#board-wrapper');
_board_wrapper !== '_bored_rapper';

const _board = $('.board-local');
const _board_separator = $('.board-separator');
const _board_separator_ctx = _board_separator.getContext('2d');
_board_separator_ctx.font = '30px Arial';
_board_separator_ctx.fillText('Loading', 2048, 2047);

function clear_loading() {
  _board_separator_ctx.clearRect(0, 0, _board_separator.width, _board_separator.height);
}

const _overlay = $('.board-overlay');
const _overlay_ctx = _overlay.getContext('2d');

const _ctx = _board.getContext('2d');
_ctx.strokeStyle = _drawing.color;
_ctx.lineWidth = _drawing.thickness;

let _boards = {
  [_user_hash]: {
    ctx: _ctx,
    board: _board
  }
};

const _user_display = $('#user-list tbody');
let _groups = {};

const _side_bar = $('#side-bar');
const _side_bar_lower = $('#side-bar-lower');

const _board_options = $('#board-options');

const _color_indicator = $('#btn-color-indicator');
//_color_indicator.onclick = function() {this.blur();};
_color_indicator.style.backgroundColor = _drawing.color;
const _color_btns = $$('.btn-color', _side_bar);


const _btn_undo = $('#btn-undo');
const _btn_redo = $('#btn-redo');
const _btn_clear = $('#btn-clear');
const _brush_size_select = $('#brush-size-select');

let _rect = _board.getBoundingClientRect();

let _draw_enabled = false;
let _move_enabled = true;

_color_btns.forEach(btn => {
  btn.style.color = btn.dataset.color;
  btn.onclick = function() {
    this.blur();
    clear_selection();
    this.classList.add('btn-secondary');
    change_color(this.dataset.color);
    set_gradients(this.dataset.grad);
  }
});

function set_gradients(grad_str) {
  let [h, s, l] = grad_str.split(',');
  if (h.length) {
    let vals = h.split('/').map(v => (parseInt(v)));
    let perc = vals[0] / vals[1];
    let x = Math.round(_hue_gradient.offsetWidth * perc) + _side_bar.offsetLeft + _hue_gradient.offsetLeft;
    gradient_slide(x, _hue_gradient);
    gradient_slide(0, _saturation_gradient);
    gradient_slide((_luminosity_gradient.offsetWidth / 2) + _side_bar.offsetLeft + _hue_gradient.offsetLeft, _luminosity_gradient);
  }
  if (l.length) {
    gradient_slide((_luminosity_gradient.offsetWidth * (parseInt(l) / 100)) + _side_bar.offsetLeft + _hue_gradient.offsetLeft, _luminosity_gradient);
  }
}

function clear_selection() {
  _color_btns.forEach(btn => {btn.classList.remove('btn-secondary');});
}

function reset_sliders() {
  [_hue_gradient, _saturation_gradient, _luminosity_gradient].map(g => {move_slider(g)});
}

function change_color(color) {
  _drawing.color = color;
  _color_indicator.style.backgroundColor = _drawing.color;
  _ctx.strokeStyle = _drawing.color;
}

let _brush_sizes = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 30, 50, 75, 100, 150];

_brush_size_select.value = _drawing.thickness;
for (let brush_size of _brush_sizes) {
  let option = document.createElement('option');
  if (brush_size === _drawing.thickness) option.setAttribute('selected', true);
  option.innerHTML = brush_size;
  _brush_size_select.appendChild(option);
}

_board_wrapper.style.cursor = 'grab';

_board_wrapper.style.height = (window.innerHeight) + 'px';
window.onresize = function() {
  _board_wrapper.style.height = (window.innerHeight) + 'px';
  _rect = _board.getBoundingClientRect();
}

function update_redo_btn_status(drawing, status=null) {
  if (status !== null) _btn_redo.disabled = status;
  else if (_drawing.segments.length) {
    if (_drawing.end_index < _drawing.segments.length - 1) {
      _btn_redo.disabled = false;
    }
    if (_drawing.end_index > -1) _btn_undo.disabled = false;
  }
}

function update_btn_clear_status(segments, end_index=null, status=null) {
  if (status !== null) _btn_clear.disabled = status;
  else if (end_index === -1) _btn_clear.disabled = true;
  else if (segments && segments.length) {
    if (segments.length > 1
    || segments.length === 1
    && segments[0] !== 'CLEAR') {
      _btn_clear.disabled = false;
    }
    else _btn_clear.disabled = true;
  }
}

// still broken, completed segments need to be sent to other session on save

function handle_data(data) {
  console.log('rcv', data, _connection_id);
  if (data.drawings) {
    for (let drawing of data.drawings) {
      if ('self' in drawing) {
        _drawing = drawing;
        _color_indicator.style.backgroundColor = _drawing.color;
        _brush_size_select.value = _drawing.thickness;
      }
      process_drawing_data(drawing, draw=true);
    }
    update_btn_clear_status(_drawing.segments, _drawing.end_index);
    if (_drawing.segments.length) {
      if (_drawing.end_index < _drawing.segments.length - 1) {
        _btn_redo.disabled = false;
      }
      if (_drawing.end_index > -1) _btn_undo.disabled = false;
    }
  }
  if (data.set_connection_id && _connection_id === null) {
    _connection_id = data.set_connection_id;
  }
  if (data.stroke_arr !== undefined || data.redraw !== undefined) {
    multi_session_fix(data);
    let ctx = null;
    if (data.overlay) {
      ctx = _overlay_ctx;
    }
    else {
      create_board(data.hash);
      ctx = _boards[data.hash].ctx;
    }
    console.log('test')
    if (data.stroke_arr) {
      draw_strokes(
        data.stroke_arr, data.stroke_color,
        data.stroke_width, ctx
      );
    }
    console.log('test 2')
  }
  if (data.action) update_users(data);
  if (data.clear) {
    let ctx = _boards[data.hash].ctx;
    ctx.clearRect(0, 0, _board.width, _board.height);
  }
  if (data.segments && data.redraw) {
    console.log('processing')
    process_drawing_data(data, draw=true);
    console.log('complete');
  }
}

let _temp_segment = null;

function multi_session_fix(data) {
  console.log('multi')
  if (data.self !== undefined) {
    console.log('fixing', _temp_segment)
    if ('clear' in data) _drawing.segments.push('CLEAR')
    if (!('redraw' in data)) {
      if (_temp_segment === null) {
        _temp_segment = {
          color: data.stroke_color,
          coords: data.stroke_arr[0],
          thickness: data.stroke_width
        };
      }
      else {
        _temp_segment.coords.push.apply(
          _temp_segment.coords, data.stroke_arr[0].slice(1)
        );
      }
    }
    console.log(data.end_index, data.segment_count)
    if (data.end_index !== undefined && data.segment_count !== undefined) {
      console.log('segment end', data.end_index)
      _drawing.end_index = data.end_index;
      if (_drawing.segments.length > data.segment_count) {
        _drawing.segments = _drawing.segments.slice(0, data.segment_count);
      }
      if (_temp_segment !== null) _drawing.segments.push(_temp_segment);
      _temp_segment = null;
    }
    if (_drawing.end_index > -1) _btn_undo.disabled = false;
    else _btn_undo.disabled = true;
    if (_drawing.end_index < _drawing.segments.length - 1) {
      _btn_redo.disabled = false;
    }
    else _btn_redo.disabled = true;
    if (_drawing.end_index === -1 || _drawing.segments[_drawing.end_index] === 'CLEAR') {
      _btn_clear.disabled = true;
    }
    else _btn_clear.disabled = false;
  }
}

function process_drawing_data(drawing, draw=false) {
  let ctx;
  let segments = drawing.segments;
  if (drawing.hash === _user_hash) ctx = _ctx;
  else {
    create_board(drawing.hash);
    ctx = _boards[drawing.hash].ctx;
  }
  ctx.clearRect(0, 0, _board.width, _board.height);
  if (drawing.end_index !== undefined) {
    segments = segments.slice(0, drawing.end_index + 1);
    let start_index = segments.lastIndexOf('CLEAR');
    if (start_index > 0) segments = segments.slice(start_index);
  }
  if (drawing.redraw) ctx.clearRect(0, 0, _board.width, _board.height);
  for (let segment of segments) {
    if (segment !== 'CLEAR' && draw === true) {
      draw_strokes([segment.coords], segment.color, segment.thickness, ctx);
    }
  }
  return segments;
}

function update_users(data) {
  if (data.action === 'load') user_load(data);
  if (data.action === 'connected') user_connect(data);
  if (data.action === 'update') user_update(data);
  if (data.action === 'disconnected') user_disconnected(data);
}

function user_load(data) {
  clear_loading();
  _groups = {}; // reconnect
  if (data.drawings) {
    for (let drawing of data.drawings) {
      let hash = drawing.hash;
      let nickname = drawing.nickname;
      let group_name = drawing.drawing_group;
      if (!(group_name in _groups)) _groups[group_name] = [];
      let user = {
        nickname: nickname,
        hash: hash,
        group_name: group_name
      };
      _groups[group_name].push(user);
    }
    let group_names = Object.keys(_groups);
    group_names.sort();
    for (let group_name of group_names) {
      _groups[group_name].sort((a, b) => (a.nickname > b.nickname));
      build_group_elements(group_name);
    }
  }
  if (data.users) {
    for (let user of data.users) {
      build_group_elements(user.group);
      check_user_elements(user, user.group, connected=true);
    }
  }
}

function user_connect(data) {
  let new_group = false;
  let group_name = '* * M A I N * *';
  if ('group_name' in data) group_name = data.group_name;
  if (!(group_name in _groups)) {
    _groups[group_name] = [];
    new_group = true;
  }
  let user = _groups[group_name].filter(u => (u.hash === data.hash));
  user = user.length ? user[0] : null;
  if (user === null) {
    user = {
      nickname: data.nickname,
      hash: data.hash,
      group_name: group_name,
      has_drawings: false
    };
    _groups[group_name].push(user);
    _groups[group_name].sort((a, b) => (a.nickname + a.hash > b.nickname + b.hash));
    if (new_group) build_group_elements(group_name);
  }
  if (user.nickname !== data.nickname) {
    user.nickname = data.nickname;
  }
  check_user_elements(user, group_name, connected=true);
  if (data.hash !== _user_hash) create_board(data.hash);
}

function user_update(data) {
  //console.log('update', data);
}

function user_disconnected(data) {
  let disp = $('#hash-display-' + data.hash);
  if (disp !== null) {
    disp.classList.remove('bg-danger');
    disp.classList.add('bg-secondary');
  }
}

// shorthand creation and placement of DOM elements
function el(
    type, inner='', classname='', attrs={},
    parent=undefined, pos_end=true, before=0
  ) {
  let elem = document.createElement(type);
  elem.innerHTML = inner;
  if (classname.length) elem.className = classname;
  let attr_keys = Object.keys(attrs);
  for (let key of attr_keys) elem.setAttribute(key, attrs[key]);
  if (parent) {
    if (pos_end) parent.appendChild(elem);
    else {
      let rel_elem = before;
      if (typeof before === 'number') rel_elem = parent.childNodes[before];
      if (rel_elem) parent.insertBefore(elem, rel_elem);
      else parent.appendChild(elem);
    }
  }
  return elem;
}

// build elements for a group of users in the user list
function build_group_elements(group_name) {
  let group = _groups[group_name];
  let headers = $$('.group-header', _user_display);
  headers = headers.filter(a => (a.dataset.group_name === group_name));
  let group_header_tr = headers.length ? headers[0] : null;
  if (group_header_tr === null) {
    group_header_tr = el('tr', '', 'bg-secondary group-header', {'data-group_name': group_name}, _user_display);
    el('th', '<h5>toggle all drawings</h5>', 'bg-dark text-right mid-col', {colspan: 3}, group_header_tr);
    el(
      'button', '&nbsp;o&nbsp;', 'btn btn-outline-secondary btn-dark text-light btn-toggle-group',
      {
        'data-group': group_name,
        'data-display': 'inherit',
        'data-toggle': 'tooltip',
        'data-placement': 'top',
        title: 'show/hide all drawings'
      },
      el('td', '', 'bg-dark', {}, group_header_tr)
    ).onclick = toggle_group;
    if (group) for (let user of group) check_user_elements(user, group_name);
  }
}

// check for existing element. decide whether to update if it exists
// or create if it doesn't
function check_user_elements(user, group_name, connected=false) {
  let user_display_id = `user-display-${user.hash}`;
  let user_tr = document.getElementById(user_display_id);
  if (user_tr === null) build_user_elements(user, group_name, connected);
  else update_user_elements(user, group_name, user_tr);
}

// build elements for a user in the user find_index_in_user_list
function build_user_elements(user, group_name, connected=false) {
  let user_tr = el(
    'tr', '',
    `${user.hash === _user_hash ? ' user-self' : ''} user-row`,
    {
      'id': `user-display-${user.hash}`,
      'data-group': group_name,
      'data-nickname': user.nickname,
      'data-hash': user.hash
    },
    _user_display, false, find_index_in_user_list(user)
  );
  el('td', '', 'status', {}, user_tr);
  el(
    'td', user.nickname,
    `nickname${user.hash === _user_hash ? ' text-warning' : ''}`,
    {
      title: user.nickname
    }, user_tr);
  el(
    'span', `#${user.hash.substr(0, 4)}`,
    'badge badge-hash bd-dark ' + (connected ? 'badge-danger' : 'badge-secondary'),
    {id: 'hash-display-' + user.hash, title: '#' + user.hash},
    el('td', '', '', {}, user_tr)
  );
  el(
    'button', '&nbsp;o&nbsp;',
    `btn btn-outline-secondary btn-dark btn-toggle-user h-${user.hash} text-light`,
    {
      'data-hash': user.hash,
      'data-group': group_name,
      'data-display': 'inherit',
      'data-toggle': 'tooltip',
      'data-placement': 'top',
      title: 'show/hide user drawings'
    },
    el('td', '', '', {}, user_tr)
  ).onclick = toggle_user;
}

function update_user_elements(user, group_name, user_tr) {
  let nickname = $('.nickname', user_tr);
  if (nickname.innerText !== user.nickname) {
    let group = _groups[group_name];
    let hash_array = group.map(u => (u.hash));
    let old_index = hash_array.indexOf(user.hash);
    if (old_index > -1) {
      group[old_index].nickname = user.nickname;
      group.sort((a, b) => (a.nickname > b.nickname));
      hash_array = group.map(u => (u.hash));
      let new_index = hash_array.indexOf(user.hash) + 1;
      if (new_index > old_index) new_index++;
      _user_display.insertBefore(user_tr, _user_display.childNodes[new_index]);
    }
  }
  nickname.innerText = user.nickname;
  let badge = $('.badge-hash', user_tr);
  badge.classList.remove('bg-secondary');
  badge.classList.add('bg-danger');
}

function find_index_in_user_list(user) {
  let rows = _user_display.childNodes;
  let flat_rows = [];
  for (let row of rows) {
    if (row.classList.contains('group-header')) flat_rows.push(row.dataset.group_name);
    else if (row.classList.contains('user-row')) {
      flat_rows.push(row.dataset.group + row.dataset.nickname + row.dataset.hash);
    }
  }
  let group_name = 'group_name' in user ? user.group_name : '* * M A I N * *';
  let user_flat = group_name + user.nickname + user.hash;
  flat_rows.push(user_flat);
  flat_rows.sort();
  let index = flat_rows.indexOf(user_flat);
  return index;
}

function toggle_minimize() {
  this.blur();
  let display = toggle_btn(this, null, '&#9634;', '-', '', 'table-row');
  let rows = $$('.user-row');
  let group_name = this.dataset.group;
  rows = rows.filter(r => (r.dataset.group === group_name));
  for (let row of rows) row.style.display = display;
}

function toggle_group(btn=null, display=null, simple=true) {
  this.blur();
  if (!('dataset' in btn && 'group' in btn.dataset)) {
    btn = this;
    simple = false;
  }
  let users = _groups[btn.dataset.group];
  display = toggle_btn(btn, display);
  if (!simple) {
    for (let user of users) {
      let _btn = $('.btn-toggle-user.h-' + user.hash);
      toggle_user(_btn, display);
    }
  }
}

function toggle_user(btn=null, display=null, simple=true) {
  if (!('dataset' in btn && 'hash' in btn.dataset)) {
    btn = this;
    simple = false;
  };
  let group_name = btn.dataset.group;
  display = toggle_btn(btn, display);
  let hash = btn.dataset.hash;
  $('#board-' + hash).style.display = display;
  let btns = $$('.btn-toggle-user');
  btns = btns.filter(_btn => (_btn.dataset.group === group_name));
  let values = btns.map(_btn => (_btn.dataset.display === 'none'));
  let group_display = values.every(v => v) ? 'none' : 'block';
  if (!simple) {
    let group_btn = $$('.btn-toggle-group').filter(_btn => (
      _btn.dataset.group === group_name
    ))[0];
    toggle_group(group_btn, group_display);
  }
}

function toggle_btn(btn, display=null, a='o', b='&oslash;', c='&nbsp;', v='block') {
  if (display === null) display = btn.dataset.display === 'none' ? v : 'none';
  btn.dataset.display = display;
  if (display === 'none') {
    btn.classList.remove('text-light');
    btn.classList.add('text-secondary');
  }
  else {
    btn.classList.add('text-light');
    btn.classList.remove('text-secondary');
  }
  btn.innerHTML = c + (display === 'none' ? b : a) + c;
  return display;
}

function toggle_z(btn) {
  btn.blur();
  if (btn.dataset.z === 'top') {
    btn.dataset.z = 'bottom';
    btn.innerText = 'draw behind';
    _board.style.zIndex = 0;
    _board_separator.style.visibility = 'hidden';
  }
  else {
    btn.dataset.z = 'top';
    btn.innerText = 'draw on top';
    _board.style.zIndex = 5;
    _board_separator.style.visibility = 'visible';
  }
}

function create_board(hash) {
  let dict;
  if (!(hash in _boards)) {
    let board = el(
      'canvas', '', 'board board-remote', {height: '4096px', width: '4096px', 'id': 'board-' + hash}, _board_wrapper
    );
    let ctx = board.getContext('2d');
    let dict = {
      board: board,
      ctx: ctx
    };
    _boards[hash] = dict;
  }
}

let _hue_gradient = $('#hue-gradient');
let _saturation_gradient = $('#saturation-gradient');
let _luminosity_gradient = $('#luminosity-gradient');

_hue_gradient.slider = $('#hue-gradient-slider');
_hue_gradient.slider.style.top = (_hue_gradient.offsetTop + 14) + 'px';
_saturation_gradient.slider = $('#saturation-gradient-slider');
_saturation_gradient.slider.style.top = (_saturation_gradient.offsetTop + 14) + 'px';
_luminosity_gradient.slider = $('#luminosity-gradient-slider');
_luminosity_gradient.slider.style.top = (_luminosity_gradient.offsetTop + 14) + 'px';

let _hue_x = 1;
let _saturation_x = 0;
let _luminosity_x = 0;

_hue_gradient.colors = [
  [255, 0, 0],
  [255, 255, 0],
  [0, 255, 0],
  [0, 255, 255],
  [0, 0, 255],
  [255, 0, 255],
  [255, 0, 0]
];

_saturation_gradient.colors = [
  [255, 0, 0],
  [127, 127, 127]
];

_luminosity_gradient.colors = [
  [0, 0, 0],
  [255, 0, 0],
  [255, 255, 255]
];

function dec_to_hex (dec) {
  let hex = Number(dec).toString(16);
  if (hex.length < 2) {
       hex = '0' + hex;
  }
  return hex;
};

let _gradient_clicked = null;

document.body.onmousemove = event => {
  if (_gradient_clicked !== null) {
    gradient_slide(event.clientX, _gradient_clicked);
  }
}

document.body.onmouseup = event => {_gradient_clicked = null;}
document.body.onmouseenter = event => {_gradient_clicked = null;}

function gradient_click(event) {
  clear_selection();
  _gradient_clicked = this;
  gradient_slide(event.clientX, this);
}

_hue_gradient.onmousedown = gradient_click;
_saturation_gradient.onmousedown = gradient_click;
_luminosity_gradient.onmousedown = gradient_click;

function gradient_slide(clientX, gradient) {
  let [gradient_points, gradient_diffs, ratio] = get_click_data(clientX, gradient);
  let color = null;
  for (let i = 0; i < gradient_points.length; i++) {
    if (ratio >= gradient_points[i] && ratio <= gradient_points[i + 1]) {
      let inner_ratio = (gradient_points[1] - (gradient_points[i + 1] - ratio)) / gradient_points[1];
      if (inner_ratio > 1) inner_ratio = 1;
      let color_array = [];
      for (let _i = 0; _i < 3; _i++) {
        let diff_val = gradient_diffs[i][_i];
        let val = gradient.colors[i][_i];
        if (diff_val !== 0) val = Math.round(val + (diff_val * inner_ratio));
        color_array.push(val);
      }
      let hex_val = '#' + color_array.map(n => (dec_to_hex(n))).join('');
      change_color(hex_val);
      if (gradient.dataset.type === 'hue') {
        update_saturation(color_array);
      }
      if (gradient.dataset.type === 'saturation') {
        _saturation_x = clientX;
        move_slider(_hue_gradient, _hue_x);
        update_luminosity(color_array);
      }
      if (gradient.dataset.type === 'luminosity') {
        _luminosity_x = clientX;
        move_slider(_hue_gradient, _hue_x);
        move_slider(_saturation_gradient, _saturation_x - _side_bar.offsetLeft - _saturation_gradient.offsetLeft)
      }
      break;
    }
  }
}

function get_click_data(clientX, gradient) {
  let gradient_points = gradient.colors.map((c, i) => (i / (gradient.colors.length - 1)));

  let gradient_diffs = [];

  for (let i = 0; i < gradient.colors.length - 1; i++) {
    let point_a = gradient.colors[i];
    let point_b = gradient.colors[i + 1];
    let diff_array = point_a.map((n, i) => (point_b[i] - n));
    gradient_diffs.push(diff_array);
  }

  let left = clientX - _side_bar.offsetLeft - gradient.offsetLeft;
  let width = gradient.offsetWidth;
  if (left < 0) left = 0;
  if (left > width) left = width;
  let ratio = 1 - ((width - left) / width);

  if (gradient.dataset.type === 'hue') _hue_x = left;

  move_slider(gradient, left);

  return [gradient_points, gradient_diffs, ratio]
}

function move_slider(gradient, left=null, center=false) {
  let min = gradient.offsetLeft + 1;
  let max = min + gradient.offsetWidth;
  let slider = gradient.slider;
  if (left === null) slider.style.visibility = 'hidden';
  else {
    if (center) left = Math.ceil(gradient.offsetWidth / 2);
    left = gradient.offsetLeft + left;
    if (left < min) left = min;
    if (left > max) left = max;
    slider.style.visibility = 'visible';
    slider.style.left = (left - 6) + 'px';
    slider.style.top = (gradient.offsetTop + 14) + 'px';
  }
}

function update_saturation(color_array) {
  _saturation_gradient.colors[0] = color_array;
  update_gradient(_saturation_gradient);
  gradient_slide(_saturation_x, _saturation_gradient);
}

function update_luminosity(color_array) {
  _luminosity_gradient.colors[1] = color_array;
  update_gradient(_luminosity_gradient);
  if (_luminosity_x !== 0) gradient_slide(_luminosity_x, _luminosity_gradient);
  else move_slider(_luminosity_gradient, 0, true);
}

function update_gradient(gradient) {
  let style = `linear-gradient(to right, ${gradient.colors.map(c => ('rgb(' + c.join(',') + ')')).join(',')})`;
  gradient.style.backgroundImage = style;
}

function send_chunk() {
  if (_stroke_chunk.length > 1) {
    send_draw_data([_stroke_chunk]);
    _stroke_chunk = [_stroke_chunk[_stroke_chunk.length - 1]];
  }
  else if (_stroke_chunk.length === 1 && _stroke_chunk[0] === 'clear') {
    send_draw_data([_stroke_chunk]);
    _stroke_chunk = [];
  }
}

function send_draw_data(arr, type='draw') {
  let msg = {
      type: type,
      stroke_arr: arr,
      stroke_color: _ctx.strokeStyle,
      stroke_width: _ctx.lineWidth
  };
  if (['save', 'clear', 'redo', 'undo'].includes(type)) {
    msg.end_index = _drawing.end_index;
    msg.segment_count = _drawing.segments.length;
  }
  console.log('send', msg)
  _socket.send(JSON.stringify(msg));
}

function toggle_colors(btn, event) {
  function click() {
    btn.blur();
    btn = $('#colors-btn');
    btn.click();
  }
  if (_side_bar_lower.dataset.visible === 'false') {
    $('#toggle-side-bar-btn').click();
    if (!$('#collapse-colors').classList.contains('show')) click();
  }
  else click();
}

function toggle_options(btn, event, cb=null) {
  btn.blur();
  let span = $('span', btn);
  span.classList.toggle('section-expanded');
  setTimeout(function() {
    btn.disabled = true;
  }, 50);
  setTimeout(function() {
    btn.disabled = false;
  }, 500);
  if (cb !== null) {
    cb();
  }
}

let visibility_timer = null;

function clear_timer(timer) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function toggle_side_bar_lower(visible=null) {
  clear_timer(visibility_timer);
  if (visible === null) {
    visible = !(_side_bar_lower.dataset.visible === 'true');
    _side_bar_lower.dataset.visible = visible;
  }
  if (visible) {
    _side_bar_lower.style.display = '';
    visibility_timer = setTimeout(function() {
      _side_bar_lower.classList.remove('hidden');
    }, 50)
  }
  else {
    _side_bar_lower.classList.add('hidden');
    if (visibility_timer) clearTimeout(visibility_timer);
    visibility_timer = setTimeout(function() {
      _side_bar_lower.style.display = 'none';
    }, 250);
  }
}

setTimeout(function() {
  $('#toggle-side-bar-btn').click();
}, 750);
