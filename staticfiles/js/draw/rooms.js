let input = document.getElementById('room-input');
let btn = document.getElementById('room-submit');

btn.onclick = function() {
  let room_name = input.value;
  if (input.value.length) {
    window.location.pathname = '/draw/' + room_name + '/';
  }
}
