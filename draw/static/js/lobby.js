const nickname_input = document.getElementById('id_nickname');
const btn_randomize_nickname = document.getElementById('btn-randomize-nickname');
const room_name_search_input = document.getElementById('id_search_name');
const room_name_input = document.getElementById('id_name');
const btn_randomize_room_name = document.getElementById('btn-randomize-search_name');
const submit_btn = document.getElementById('room-submit');
const room_details = document.getElementById('room-details');
const room_name_display = document.getElementById('room-name-display');
const room_creator_display = document.getElementById('room-creator-display');
const join_btn = document.getElementById('join-btn');
const room_btn_list = [].slice.call(document.getElementsByClassName('room-btn'));

var selected_room = '';

let nickname_i = 0;
let room_name_i = 0;

btn_randomize_nickname.onclick = function() {
  nickname_input.setAttribute('value', nicknames[nickname_i]);
  nickname_i++;
  if (nickname_i >= 100) {
    nickname_i = 0;
  }
}

btn_randomize_room_name.onclick = function() {
  room_name_search_input.setAttribute('value', room_names[room_name_i]);
  room_name_i++;
  if (room_name_i >= 100) {
    room_name_i = 0;
  }
}

function update_selection() {
  for (let btn of room_btn_list) {
    if (btn.dataset.room_name === selected_room) {
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
    }
    else if (btn.classList.contains('btn-primary')) {
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
    }
  }
}

function display_room_details(button) {
  button.blur();
  join_btn.innerText = 'join drawing room';
  button.classList.add('btn-primary');
  button.classList.remove('btn-secondary');
  room_selected();
  selected_room = button.dataset.room_name;
  room_name_input.setAttribute('value', selected_room);
  update_selection();
  room_name_display.innerText = button.dataset.room_name;
  room_creator_display.innerHTML = `
    ${button.dataset.room_creator_nickname} <span class="badge badge-dark">${button.dataset.room_creator_hash.slice(0,4)}</span>
  `;
  join_btn.href = '/draw/room/' + button.dataset.room_name;
}

function room_selected() {
  room_details.querySelector('h5').classList.add('hidden');
  room_details.querySelector('table').classList.remove('hidden');
  room_details.querySelector('button').classList.remove('hidden');
}

function get_cookie(name) {
    var cookie_value = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookie_value = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookie_value;
}
var csrftoken = get_cookie('csrftoken');

function request_data(button) {
  button.blur();
  var xhr = new XMLHttpRequest();
  var room_name = document.getElementById('id_search_name').value;
  selected_room = room_name;
  room_name_input.setAttribute('value', room_name);
  update_selection();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      let r = JSON.parse(xhr.response);
      if ('type' in r) {
        if (r.type === 'room_details') {
          room_name_display.innerText = room_name;
          room_selected();
          join_btn.href = '/draw/room/' + room_name;
          if ('nickname' in r && 'hash' in r) {
            room_creator_display.innerHTML = `${r.nickname} <span class="badge badge-dark">${r.hash.slice(0, 4)}</span>`;
            join_btn.innerText = 'join drawing room';
          }
          else {
            room_creator_display.innerHTML = 'room not yet created';
            join_btn.innerText = 'create drawing room';
          }
        }
      }
    }
  };
  xhr.open('POST', './');
  xhr.setRequestHeader('X-CSRFToken', csrftoken);
  xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
  xhr.send(JSON.stringify({
    type: 'get_room_details',
    room_name: room_name
  }));
}

function join_room() {
  var xhr = new XMLHttpRequest();
  var nickname = document.getElementById('id_nickname').value;
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      let r = JSON.parse(xhr.response);
      if ('type' in r) {
        if (r.type === 'join') {
          window.location.href = '/draw/room/' + selected_room;
        }
      }
    }
  };
  xhr.open('POST', './');
  xhr.setRequestHeader('X-CSRFToken', csrftoken);
  xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
  xhr.send(JSON.stringify({
    type: 'join_room',
    room_name: selected_room,
    nickname: nickname
  }));
}
