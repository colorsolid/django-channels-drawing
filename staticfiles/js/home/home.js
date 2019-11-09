document.body.style.backgroundColor = '#0c0c0c';

var main = document.getElementById('main');
var debug = document.getElementById('debug');
var box_header = document.getElementById('box-header');

let main_left_centered = (window.innerWidth - main.offsetWidth) / 2;
let main_top_centered = (window.innerHeight - main.offsetHeight) / 2;

main.style.left = main_left_centered + 'px';
main.style.top = main_top_centered + 'px';

let letters = [
  {letter: 'S', x: 10, y: 55},
  {letter: 'k', x: 50, y: 55},
  {letter: 'y', x: 83, y: 55},
  {letter: 'r', x: 117, y: 55},
  {letter: 'a', x: 140, y: 55},
  {letter: 'y', x: 174, y: 55},
  {letter: 'L', x: 65, y: 100},
  {letter: 'a', x: 102, y: 100},
  {letter: 'b', x: 135, y: 100},
  {letter: 's', x: 172, y: 100},
];

for (let letter of letters) {
  let text = `<text x="${letter.x}" y="${letter.y}" class="letter black">${letter.letter}</text>`;
  box_header.innerHTML += text;
}

let elems = box_header.getElementsByTagName('text');
for (let i = 0; i < elems.length; i++) {
  letters[i].elem = elems[i];
}

let counted = 0;
for (let i = 0; i < box_header.childNodes.length; i++) {
  let node = box_header.childNodes[i];
  console.log(typeof node);

  if (node.innerHTML !== undefined) {
    letters[counted].elem = node;
    counted++;
  }
}

const main_x_move_limit = 50;
const main_y_move_limit = 30;

const letter_x_move_limit = 4;
const letter_y_move_limit = 3;

let letter_x_move = 1;
let letter_y_move = 1;

document.onmousemove = function(event) {
  let x_diff = event.clientX - (window.innerWidth / 2);
  let y_diff = event.clientY - (window.innerHeight / 2);

  let x_factor = x_diff / (window.innerWidth / 2);
  let y_factor = y_diff / (window.innerHeight / 2);

  let letter_factor = Math.abs(x_factor) > Math.abs(y_factor) ? x_factor : y_factor;

  let main_x_move = Math.round(x_factor * main_x_move_limit) * -1;
  let main_y_move = Math.round(y_factor * main_y_move_limit) * -1;

  letter_x_move = Math.round(letter_factor * letter_x_move_limit);
  letter_y_move = Math.round(letter_factor * letter_y_move_limit);

  letter_x_move = letter_x_move !== 0 ? letter_x_move : 1;
  letter_y_move = letter_y_move !== 0 ? letter_y_move : 1;

  main.style.left = `${main_left_centered + main_x_move}px`;
  main.style.top = `${main_top_centered + main_y_move}px`;
}

setInterval(function() {
  for (let letter of letters) {
    let rand = Math.round(Math.random() * 2) - 1;
    letter.elem.setAttribute('x', letter.x - ((Math.round(Math.random() * 2) - 1) * letter_x_move));
    letter.elem.setAttribute('y', letter.y - ((Math.round(Math.random() * 2) - 1) * letter_y_move));
  }
}, 10);
