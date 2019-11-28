var users = [];
var user_display = document.getElementById('user-list');

function update_user_display(data) {
  console.log('updating display')
  if (data.note === 'load') {
    users = data.list;
  }
  if (data.note === 'connected') {
    users.push({nickname: data.nickname, hash: data.hash});
  }
  if (data.note === 'update') {
    for (let user of users) {
      if (user.nickname.toLowerCase() === data.old_nickname.toLowerCase()
      && user.hash.toLowerCase() === data.hash.toLowerCase()) {
        user.nickname = data.nickname;
      }
    }
  }
  if (data.note === 'disconnected') {
    users = users.filter(u => (
      !(u.nickname.toLowerCase() === data.nickname.toLowerCase() && u.hash.toLowerCase() === data.hash.toLowerCase())
    ));
  }
  users.sort((a, b) => (a.nickname > b.nickname));
  console.log(users);
  user_display.innerHTML = '';
  for (let user of users) {
    user_display.innerHTML += `
      <div>
        ${user.nickname}#${user.hash}
      </div>
    `;
  }
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
    console.log('%c welcome ', 'background: #4444bb; color: #01fdfd;');
  };

  socket.onerror = function(e) {
    console.log('error', e);
  };

  socket.onclose = function(e) {
    console.log('%c goodbye ', 'background: #4444bb; color: #01fdfd;');
  };

  socket.onmessage = function(e) {
    let data = JSON.parse(e.data);
    console.log('message data', data);
    if (data.set_connection_id && connection_id === null) {
      connection_id = data.set_connection_id;
    }
    else if (data.connection_id && data.connection_id !== connection_id) {
      console.log(data.connection_id, connection_id);
      if (data.stroke_arr) {
        console.log('drawing from socket');
        draw_strokes(data.stroke_arr, data.stroke_color, ctx_remote);
      }
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
      send_data([stroke_chunk]);
      stroke_chunk = [stroke_chunk[stroke_chunk.length - 1]];
    }
  }
}

function send_data(arr, type='draw') {
  socket.send(JSON.stringify({
      type: type,
      user_id: user_id,
      connection_id: connection_id,
      stroke_arr: arr,
      stroke_color: ctx.strokeStyle
  }));
}

send_timer = setInterval(socket_interval, 500);
