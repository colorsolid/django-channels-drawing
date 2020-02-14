window.onload = function() {
  window.scrollTo(0, 0);
}

const user_display = document.querySelector('#user-list tbody');
var groups = {};

var loaded = false;

var _drawing = {
  segments: [],
  end_index: -1,
  color: '#000000',
  thickness: 3,
  drawing_group: '* * M A I N * *',
  hash: user_hash,
  nickname: nickname,
  self: true
};

const main = document.getElementById('main');
const board = document.querySelector('.board-local');
const pos = document.getElementById('pos');
const board_wrapper = document.getElementById('board-wrapper');
board_wrapper !== 'bored_rapper';
const functions_bar = document.getElementById('functions-bar');

const color_indic = document.getElementById('btn-color-indicator');
color_indic.style.backgroundColor = _drawing.color;
const color_btns = functions_bar.querySelectorAll('.btn-color');


const btn_undo = document.getElementById('btn-undo');
const btn_redo = document.getElementById('btn-redo');
const btn_clear = document.getElementById('btn-clear');
const brush_size_select = document.getElementById('brush-size-select');

var rect = board.getBoundingClientRect();

var draw_enabled = false;
var move_enabled = true;

var ctx = board.getContext('2d');
ctx.strokeStyle = _drawing.color;
ctx.lineWidth = _drawing.thickness;

var remote_boards = {};

color_btns.forEach(btn => {
  btn.style.color = btn.dataset.color;
  btn.onclick = function() {
    color_btns.forEach(btn => {btn.classList.remove('btn-secondary');});
    this.classList.add('btn-secondary');
    _drawing.color = this.dataset.color;
    color_indic.style.backgroundColor = _drawing.color;
    ctx.strokeStyle = _drawing.color;
  }
});

var brush_sizes = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 30, 50, 75, 100, 150];

brush_size_select.value = _drawing.thickness;
for (let brush_size of brush_sizes) {
  let option = document.createElement('option');
  if (brush_size === _drawing.thickness) {
    option.setAttribute('selected', true);
  }
  option.innerHTML = brush_size;
  brush_size_select.appendChild(option);
}

board_wrapper.style.cursor = 'grab';

board_wrapper.style.height = (window.innerHeight) + 'px';
window.onresize = function() {
  board_wrapper.style.height = (window.innerHeight) + 'px';
  rect = board.getBoundingClientRect();
}

function update_redo_btn_status(drawing, status=null) {
  if (status !== null) btn_redo.disabled = status;
  else {
    if (_drawing.segments.length) {
      if (_drawing.end_index < _drawing.segments.length - 1) {
        btn_redo.disabled = false;
      }
      if (_drawing.end_index > -1) btn_undo.disabled = false;
    }
  }
}

function update_btn_clear_status(segments, end_index=null, status=null) {
  if (status !== null) btn_clear.disabled = status;
  else if (end_index === -1) btn_clear.disabled = true;
  else {
    if (segments && segments.length) {
      if (segments.length > 1
      || segments.length === 1
      && segments[0] !== 'CLEAR') {
        btn_clear.disabled = false;
      }
      else {
        btn_clear.disabled = true;
      }
    }
  }
}

function parse_data(data) {
  ctx.beginPath();

  ctx.arc(25, 25, 20, 0, Math.PI * 2, false);

  ctx.fill();
  ctx.closePath();
  let segments = null;
  if (data.drawings) {
    for (let drawing of data.drawings) {
      if ('self' in drawing) {
        _drawing = drawing;
        color_indic.style.backgroundColor = _drawing.color;
        brush_size_select.value = _drawing.thickness;
      }
      segments = process_drawing_data(drawing, draw=true);
    }
    update_btn_clear_status(_drawing.segments, _drawing.end_index);
    if (_drawing.segments.length) {
      if (_drawing.end_index < _drawing.segments.length - 1) {
        btn_redo.disabled = false;
      }
      if (_drawing.end_index > -1) btn_undo.disabled = false;
    }
  }
  if (data.set_connection_id && connection_id === null) {
    connection_id = data.set_connection_id;
  }
  if (data.stroke_arr) {
    let ctx_id = create_board(data.nickname, data.hash);
    draw_strokes(
      data.stroke_arr, data.stroke_color,
      data.stroke_width, remote_boards[ctx_id].ctx
    );
  }
  if (data.note) update_users(data);
  if (data.clear) {
    let ctx = remote_boards[data.nickname + '!' + data.hash].ctx;
    ctx.clearRect(0, 0, board.width, board.height);
  }
  if (data.segments && data.redraw) {
    process_drawing_data(data, draw=true);
  }
}


// assign ctx, trim segments, clear board || CLEAN UP
function process_drawing_data(drawing, draw=false) {
  let _ctx;
  let segments = drawing.segments;
  if (drawing.hash === user_hash) _ctx = ctx;
  else {
    let ctx_id = create_board(drawing.nickname, drawing.hash);
    _ctx = remote_boards[ctx_id].ctx;
  }
  _ctx.clearRect(0, 0, board.width, board.height);
  if (drawing.end_index !== undefined) {
    segments = segments.slice(0, drawing.end_index + 1);
    let start_index = segments.lastIndexOf('CLEAR');
    if (start_index > 0) segments = segments.slice(start_index);
  }
  if (drawing.redraw) _ctx.clearRect(0, 0, board.width, board.height);
  for (let segment of segments) {
    if (segment !== 'CLEAR' && draw === true) {
      draw_strokes([segment.coords], segment.color, segment.thickness, _ctx);
    }
  }
  return segments;
}


function update_users(data) {
  if (data.note === 'load') user_load(data);
  if (data.note === 'connected') user_connect(data);
  if (data.note === 'update') user_update(data);
  if (data.note === 'disconnected') user_disconnected(data);
}


function user_load(data) {
  groups = {}; // reconnect
  if (data.drawings) {
    for (let drawing of data.drawings) {
      let hash = drawing.hash;
      let nickname = drawing.nickname;
      let group_name = drawing.drawing_group;
      if (!(group_name in groups)) {
        groups[group_name] = [];
      }
      let user = {
        nickname: nickname,
        hash: hash,
        group_name: group_name
      };
      groups[group_name].push(user);
    }
    let group_names = Object.keys(groups);
    group_names.sort();
    for (let group_name of group_names) {
      groups[group_name].sort((a, b) => (a.nickname > b.nickname));
      build_group_elements(group_name);
    }
  }
  if (data.users) {
    for (let user of data.users) {
      build_group_elements(user.group);
      build_user_elements(user, user.group, connected=true);
    }
  }
}


function user_connect(data) {
  let new_group = false;
  let group_name = '* * M A I N * *';
  if (!(group_name in groups)) {
    groups[group_name] = [];
    new_group = true;
  }
  let user = groups[group_name].filter(u => (u.hash === data.hash));
  user = user.length ? user[0] : null;
  if (user === null) {
    user = {
      nickname: data.nickname,
      hash: data.hash
    };
    groups[group_name].push(user);
    groups[group_name].sort((a, b) => (a.nickname + a.hash > b.nickname + b.hash));
    if (new_group) {
      build_group_elements(group_name);
    }
  }
  build_user_elements(user, group_name, connected=true);
  if (data.hash !== user_hash) {
    create_board(data.nickname, data.hash);
  }
}


function user_update(data) {
  console.log('update', data);
}


function user_disconnected(data) {
  console.log('disconnected', data);
}


function el(type, inner='', classname='', attrs={}, parent=undefined, pos_end=true, before_index=0) {
  let elem = document.createElement(type);
  elem.innerHTML = inner;
  if (classname.length) elem.className = classname;
  let attr_keys = Object.keys(attrs);
  for (let key of attr_keys) elem.setAttribute(key, attrs[key]);
  if (parent) {
    if (pos_end) parent.appendChild(elem);
    else {
      let rel_elem = parent.childNodes[before_index];
      if (rel_elem) {
        parent.insertBefore(elem, rel_elem);
      }
      else {
        parent.appendChild(elem);
      }
    }
  }
  return elem;
}


function build_group_elements(group_name) {
  let group = groups[group_name];
  let headers = [].slice.call(user_display.getElementsByClassName('group-header'));
  headers = headers.filter(a => (a.dataset.group_name === group_name));
  let group_header_tr = headers.length ? headers[0] : null;
  if (group_header_tr === null) {
    group_header_tr = el('tr', '', 'bg-secondary group-header', {'data-group_name': group_name}, user_display);
    el(
      'button', '&#9634;', 'btn btn-dark btn-outline-secondary text-light',
      {
        'data-group': group_name,
        'data-toggle': 'tooltip',
        'data-display': 'inherit',
        'data-placement': 'top',
        title: 'toggle group user names'
      },
      el('td', '', '', {}, group_header_tr)
    ).onclick = toggle_minimize;
    el('td', group_name, 'text-right', {colspan: 2}, group_header_tr);
    el(
      'button', '&nbsp;o&nbsp;', 'btn btn-outline-secondary btn-dark text-light btn-toggle-group',
      {
        'data-group': group_name,
        'data-display': 'inherit',
        'data-toggle': 'tooltip',
        'data-placement': 'top',
        title: 'toggle group drawings'
      },
      el('td', '', '', {}, group_header_tr)
    ).onclick = toggle_group;
    if (group) {
      for (let user of group) {
        build_user_elements(user, group_name);
      }
    }
  }
}


function build_user_elements(user, group_name, connected=false) {
  let user_display_id = `user-display-${user.hash}`;
  let user_tr = document.getElementById(user_display_id);
  if (user_tr === null) {
    user_tr = el(
      'tr', '',
      `${user.hash === user_hash ? ' user-self' : ''} user-row`,
      {
        'id': `user-display-${user.hash}`,
        'data-group': group_name,
        'data-nickname': user.nickname,
        'data-hash': user.hash
      },
      user_display, false, find_index(user)
    );
    el('td', '', 'status', {}, user_tr);
    el('td', user.nickname, 'nickname', {}, user_tr);
    el(
      'span', '#' + user.hash.substr(0, 4),
      'badge badge-hash bd-dark ' + (connected ? 'badge-danger' : 'badge-secondary'), {},
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
        title: 'toggle user\'s drawings'
      },
      el('td', '', '', {}, user_tr)
    ).onclick = toggle_user;
  }
  else {
    let badge = user_tr.querySelector('.badge-hash');
    badge.classList.remove('badge-secondary');
    badge.classList.add('badge-danger');
  }
}


function find_index(user) {
  let rows = user_display.childNodes;
  let flat_rows = [];
  for (let row of rows) {
    if (row.classList.contains('group-header')) {
      flat_rows.push(row.dataset.group_name);
    }
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
  let display = toggle_btn(this, null, '&#9634;', '-', '', 'table-row');
  let rows = [].slice.call(document.getElementsByClassName('user-row'));
  let group_name = this.dataset.group;
  rows = rows.filter(r => (r.dataset.group === group_name));
  for (let row of rows) row.style.display = display;
}


function toggle_group(btn=null, display=null, simple=true) {
  if (!('dataset' in btn && 'group' in btn.dataset)) {
    btn = this;
    simple = false;
  }
  let users = groups[btn.dataset.group];
  display = toggle_btn(btn, display);
  if (!simple) {
    for (let user of users) {
      let _btn = document.querySelector('.btn-toggle-user.h-' + user.hash);
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
  document.getElementById('board-' + hash).style.display = display;
  let btns = [].slice.call(document.getElementsByClassName('btn-toggle-user'));
  btns = btns.filter(_btn => (_btn.dataset.group === group_name));
  let values = btns.map(_btn => (_btn.dataset.display === 'none'));
  let group_display = values.every(v => v) ? 'none' : 'block';
  if (!simple) {
    let group_btn = [].slice.call(document.getElementsByClassName('btn-toggle-group')).filter(_btn => (
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


function create_board(nickname, hash) {
  let ctx_id = nickname + '!' + hash;
  let dict
  if (!(ctx_id in remote_boards)) {
    let board = el(
      'canvas', '', 'board-remote', {height: '4096px', width: '4096px', 'id': 'board-' + hash}, board_wrapper
    );
    let ctx = board.getContext('2d');
    let dict = {
      board: board,
      ctx: ctx
    };
    remote_boards[ctx_id] = dict;
  }
  return ctx_id;
}
