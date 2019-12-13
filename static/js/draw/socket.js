var _drawing = {
  segments: [],
  start_index: 0,
  end_index: 0
};


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
        if ('user_id' in drawing && drawing.user_id === user_id) {
          console.log('drrr', drawing);
          let start_index = drawing['segments'].lastIndexOf('CLEAR');
          if (start_index === -1) start_index = 0;
          drawing['start_index'] = start_index;
          _drawing = drawing;
        }
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
      send_draw_data([stroke_chunk]);
      stroke_chunk = [stroke_chunk[stroke_chunk.length - 1]];
    }
    else if (stroke_chunk.length === 1 && stroke_chunk[0] === 'clear') {
      send_draw_data([stroke_chunk]);
      stroke_chunk = [];
    }
  }
}

function send_draw_data(arr, type='draw') {
  socket.send(JSON.stringify({
      type: type,
      stroke_arr: arr,
      stroke_color: ctx.strokeStyle
  }));
}

send_timer = setInterval(socket_interval, 500);
