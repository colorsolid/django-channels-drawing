const $ = function(selector, parent) {
    return (parent ? parent : document).querySelector(selector);
};

const $$ = function(selector, parent) {
    return [].slice.call((parent ? parent : document).querySelectorAll(selector));
};

let _input = $('.input-chat');
let _btn_send = $('.btn-send');
let _chat_ul = $('.ul-text-box');
_btn_send.onclick = send;

let _socket = start_socket(null, `/ws/pass_chat/${room_id}`);

function send() {
  _socket.send(JSON.stringify({type: 'relay', message: _input.value}));
  _input.value = '';
}

function append_message(message) {
  let ul = document.createElement('ul');
  ul.innerText = message;
  _chat_ul.appendChild(ul);
}

function handle_data(data) {
  append_message(data.message);
}
