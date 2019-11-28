const nickname_input = document.getElementById('id_nickname');
const btn_randomize_nickname = document.getElementById('btn-randomize-nickname');
const room_name_input = document.getElementById('id_name');
const btn_randomize_room_name = document.getElementById('btn-randomize-name');
const submit_btn = document.getElementById('room-submit');

let nickname_i = 0;
let room_name_i = 0;

btn_randomize_nickname.onclick = function() {
  nickname_input.value = nicknames[nickname_i];
  nickname_i++;
  if (nickname_i >= 100) {
    nickname_i = 0;
  }
}

btn_randomize_room_name.onclick = function() {
  room_name_input.value = room_names[room_name_i];
  room_name_i++;
  if (room_name_i >= 100) {
    room_name_i = 0;
  }
}
