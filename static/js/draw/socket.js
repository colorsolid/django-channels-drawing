const groups = {}
const user_display = document.getElementById('user-list');

function update_user_display(data) {
  if (data.note === 'load') {
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
        elems: remote_boards[nickname + '!' + hash]
      };
      groups[group_name].push(user);
    }
    let group_names = Object.keys(groups);
    group_names.sort();
    user_display.innerHTML = '';
    let tbody = el('tbody', '', '', {}, parent=user_display);
    for (let group_name of group_names) {
      groups[group_name].sort((a, b) => (a.nickname > b.nickname));
      build_group_elems(groups[group_name], group_name, tbody);
    }
  }
  if (data.note === 'connected') {

  }
  if (data.note === 'update') {

  }
  if (data.note === 'disconnected') {

  }
}


function build_group_elems(group, group_name, tbody) {
  let group_header_tr = el('tr', '', 'bg-secondary', {}, tbody);
  el('td', group_name, 'text-right', {colspan: 3}, group_header_tr);
  el(
    'a', 'o', 'btn btn-dark text-light',
    {
      role: 'button',
      'data-group': group_name,
      'data-hidden': false
    },
    el('td', '', '', {}, group_header_tr)
  ).onclick = toggle_group;
  for (let user of group) {
    let user_tr = el(
      'tr', '',
      `user-${user.hash}${user.hash === user_id.substr(0, 12) ? ' user-self' : ''}`,
      {}, tbody
    );
    el('td', '', 'status', {}, user_tr);
    el('td', user.nickname, 'nickname', {}, user_tr);
    el('span', '#' + user.hash.substr(0, 4), 'badge badge-danger', {}, el('td', '', '', {}, user_tr));
    el('a', '&oslash;', 'btn btn-dark text-light',
    {
      role: 'button'
    },
    el('td', '', '', {}, user_tr));
  }
}


function toggle_group() {
  let users = groups[this.dataset.group];
  let display = this.dataset.display === 'none' ? 'inherit' : 'none';
  this.dataset.display = display;
  for (let user of users) {
    document.querySelector('#board-' + user.hash).style.display = display;
  }
}


function toggle_user(user, mode=null) {
  if (mode === null) {

  }
}


function el(type, inner='', classname='', attrs={}, parent=undefined, pos_end=true, before_index=0) {
  let elem = document.createElement(type);
  elem.innerHTML = inner;
  elem.className = classname;
  let attr_keys = Object.keys(attrs);
  for (let key of attr_keys) elem.setAttribute(key, attrs[key]);
  if (parent) {
    if (pos_end) parent.appendChild(elem);
    else {
      if (parent.childNodes.length - 1 < before_index) {
        before_index = childNodex.length - 1;
      }
      let rel_elem = parent.childNodes[before_index];
      parent.insertBefore(elem, rel_elem);
    }
  }
  return elem;
}


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
    console.log(nickname, user_id);
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
    console.log('message data', data);
    if (data.drawings) {
      for (let drawing of data.drawings) {
        draw_segments(drawing);
      }
    }
    if (data.set_connection_id && connection_id === null) {
      connection_id = data.set_connection_id;
    }
    if (data.stroke_arr) {
      let ctx_id = data.nickname + '!' + data.hash;
      if (!(ctx_id in remote_boards)) {
        remote_boards[ctx_id] = new_board(data.hash);
      }
      draw_strokes(data.stroke_arr, data.stroke_color, remote_boards[ctx_id].ctx);
    }
    if (data.note) {
      update_user_display(data);
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
      console.log(stroke_chunk);
      send_data([stroke_chunk]);
      stroke_chunk = [stroke_chunk[stroke_chunk.length - 1]];
    }
  }
}

function send_data(arr, type='draw') {
  socket.send(JSON.stringify({
      type: type,
      user_id: user_id,
      nickname: nickname,
      connection_id: connection_id,
      stroke_arr: arr,
      stroke_color: ctx.strokeStyle
  }));
}

send_timer = setInterval(socket_interval, 500);
