const user_display = document.querySelector('#user-list tbody');
var groups = {};

var loaded = false;

var _drawing = {
  segments: [],
  end_index: -1
};



function parse_data(data) {
  if (data.drawings) {
    for (let drawing of data.drawings) {
      if ('user_id' in drawing && drawing.user_id === user_id) {
        _drawing = drawing;
      }
      draw_segments(drawing);
    }
  }
  if (data.set_connection_id && connection_id === null) {
    connection_id = data.set_connection_id;
  }
  if (data.stroke_arr) {
    let ctx_id = create_board(data.nickname, data.hash);
    draw_strokes(data.stroke_arr, data.stroke_color, remote_boards[ctx_id].ctx);
  }
  if (data.note) {
    update_users(data);
  }
  if (data.clear) {
    let ctx = remote_boards[data.nickname + '!' + data.hash].ctx;
    ctx.clearRect(0, 0, board.width, board.height);
  }
  if (data.segments && data.redraw) {
    draw_segments(data);
  }
}


function update_users(data) {
  if (data.note === 'load') {
    user_load(data);
  }
  if (data.note === 'connected') {
    user_connect(data);
  }
  if (data.note === 'update') {

  }
  if (data.note === 'disconnected') {

  }
}


function user_load(data) {
  console.log('loaded')
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
        display: 'inherit',
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
      build_user_elements(user, user.group);
    }
  }
}


function user_connect(data) {
  console.log('connected', data);
  let new_group = false;
  let group_name = '* * M A I N * *';
  if (!(group_name in groups)) {
    groups[group_name] = [];
    new_group = true;
  }
  let user = groups[group_name].filter(u => (u.hash === data.hash));
  user = user.length ? user[0] : null;
  console.log('u', user, new_group);
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
    build_user_elements(user, group_name);
  }
  if (data.hash !== user_id.substr(0, 12)) {
    create_board(data.nickname, data.hash);
  }
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
  console.log('group', group);
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


function build_user_elements(user, group_name) {
  let user_display_id = `user-display-${user.hash}`;
  let user_tr = document.getElementById(user_display_id);
  if (user_tr === null) {
    user_tr = el(
      'tr', '',
      `${user.hash === user_id.substr(0, 12) ? ' user-self' : ''} user-row`,
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
    el('span', '#' + user.hash.substr(0, 4), 'badge badge-danger bd-dark', {}, el('td', '', '', {}, user_tr));
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
  console.log(user);
  console.log(flat_rows);
  console.log(rows);
  console.log(user.nickname + ' ' + index);
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
