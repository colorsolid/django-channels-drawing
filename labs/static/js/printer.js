const elements = {
  'printer_status': document.getElementById('printer-status'),
  'file_name': document.getElementById('file-name'),
  'elapsed_time': document.getElementById('elapsed-time'),
  'estimated_time': document.getElementById('estimated-time'),
  'b_temp': document.getElementById('b-temp'),
  'e_temp': document.getElementById('e-temp'),
  'file_pos': document.getElementById('file-pos'),
  'file_size': document.getElementById('file-size'),
  'progress': document.getElementById('progress'),
  'connections': document.getElementById('connections')
}

const _kb = 1024;
const _mb = _kb * 1024;

var _connections = 0;

let verify = (data, name) => ((name in data && data[name] !== null));

function parse_data(data) {
  let keys = Object.keys(data);
  for (let key of keys) {
    let el = elements[key];
    let val = data[key];
    try {
      eval(el.dataset.func)(val, el)
    }
    catch (e) {
      el.innerText = val;
    }
  }
}

function reset_displays() {
  let keys = Object.keys(elements);
  for (let key of keys) {
    let el = elements[key];
    let val = el.dataset.default;
    try {
      eval(el.dataset.func)(val, el)
    }
    catch (e) {
      el.innerText = val;
    }
  }
}

function set_time(time, el) {
  let hours = Math.floor(time / 3600);
  time -= (hours * 3600);
  let minutes = Math.floor(time / 60);
  time = Math.floor(time - (minutes * 60));
  let str = hours.toString().padStart(2, '0') + ':' +
          minutes.toString().padStart(2, '0') + ':' +
          time.toString().padStart(2, '0');
  el.innerText = str;
}

function set_size(size, el) {
  if (size > _mb) {
    el.innerText = (size / _mb).toFixed(2) + ' MB';
  }
  else if (size > _kb) {
    el.innerText = (size / _kb).toFixed(2) + ' KB';
  }
  else {
    let str = (size ? size : 0) + ' B';
    el.innerText = str;
  }
}

let set_temp = (temp, el) => {el.innerText = temp + ' °C'}

function update_progress(progress) {
  let percentage = Math.round(progress);
  document.getElementById('progress-bar').style.width = `calc(${percentage}% - 4px)`;
  document.getElementById('progress-percentage').innerText = percentage + ' %';
}

let _socket = start_socket(null, '/ws/3d/');
const send_timer = setInterval(socket_interval, 500);

reset_displays();
