var main = document.getElementById('main');
var logo = document.getElementById('logo');
var debug = document.getElementById('debug');
var box_header = document.getElementById('box-header');

/*
for (let letter of letters) {
  let text = `<text x="${letter.x}" y="${letter.y}" class="letter white">${letter.letter}</text>`;
  box_header.innerHTML += text;
}
*/

for (let [word, [x, y]] of words) {
  let factor = box_header.getBoundingClientRect().width / 240;
  let word_text = word.split('').join(' ');
  let word_text_html = `<text class="letter white" x="${x}" y="${y}"></text>`;
  box_header.innerHTML += word_text_html;
  let word_text_elements = box_header.getElementsByTagName('text');
  let word_text_element = word_text_elements[word_text_elements.length - 1];
  let elements = [];
  for (let i = 0; i < word.length; i++) {
    let letter = word[i];
    let word_part = word_text_element.innerHTML;
    if (word_part.length) {
      word_part += ' ';
    }
    word_part += letter;
    word_text_element.innerHTML = letter;
    let letter_width = word_text_element.getBoundingClientRect().width / factor;
    word_text_element.innerHTML = word_part;
    let partial_word_width = word_text_element.getBoundingClientRect().width / factor;
    let letter_x = Math.round(partial_word_width - letter_width) + x;
    let letter_html = `<text class="letter white" x="${letter_x}" y="${y}">${letter}</text>`;
    elements.push(letter_html);
  }
  for (let element of elements) {
    box_header.innerHTML += element;
  }
  word_text_element.innerHTML = word_text;
}

let elems = box_header.getElementsByTagName('text');

let letters = [];
for (let elem of elems) {
  letters.push({elem: elem, x: elem.getAttribute('x'), y: elem.getAttribute('y')});
}

let counted = 0;
for (let i = 0; i < elems; i++) {
  let node = box_header.childNodes[i];

  if (node.innerHTML !== undefined) {
    letters[counted].elem = node;
    counted++;
  }
}

let circles = logo.querySelectorAll('circle');
circles.forEach(circle => {
  letters.push({x: parseInt(circle.getAttribute('cx')), y: parseInt(circle.getAttribute('cy')), elem: circle});
});

const logo_x_move_mult = 50;
const logo_y_move_mult = 30;

var logo_left_centered, logo_top_centered,
    logo_y_range, logo_x_init, logo_y_init,
    win_x_half, win_y_half;

logo.style.marginTop = (logo_top_centered / 2) + 'px';

function update_values() {
  win_x_half = window.innerWidth / 2;
  win_y_half = window.innerHeight / 2;

  logo_left_centered = (window.innerWidth - logo.offsetWidth) / 2;
  logo_top_centered = (window.innerHeight - logo.offsetHeight) / 2;

  logo.style.marginLeft = logo_left_centered + 'px';

  logo_y_range = calc_move(window.innerHeight, 'innerHeight', win_y_half, logo_y_move_mult)[1] * -2;

  main.style.paddingTop = (logo.offsetHeight / 4) + 'px';
  logo.style.marginTop = (logo_y_range / 2) + 'px';
  logo.style.marginBottom = logo_y_range + 'px';

  let logo_rect = logo.getBoundingClientRect();
  logo_x_init = logo_rect.left + (logo.offsetWidth / 2);
  logo_y_init = logo_rect.top + (logo.offsetHeight / 2);
}

update_values();

window.onresize = update_values;

const letter_x_move_mult = 3;
const letter_y_move_mult = 2;

var letter_x_move = 1;
var letter_y_move = 1;

const timer_mult_base = 10;
var timer_mult = 29;


document.onmousemove = function(event) {
  //debug.innerHTML = `(${event.clientX}, ${event.clientY})`;

  let [x_factor, x_move] = calc_move(event.clientX, 'innerWidth', win_x_half, logo_x_move_mult);
  let [y_factor, y_move] = calc_move(event.clientY, 'innerHeight', win_y_half, logo_y_move_mult);

  logo.style.marginLeft = `${logo_left_centered + x_move}px`;
  logo.style.marginTop = `${y_move + (logo_y_range / 2)}px`;
  logo.style.marginBottom = `${logo_y_range - y_move}px`;

  let letter_y_factor = calc_move(event.clientY, 'innerHeight', logo_y_init, letter_y_move_mult)[0];
  let letter_factor = Math.abs(x_factor) > Math.abs(letter_y_factor) ? x_factor : letter_y_factor;
  timer_mult = Math.ceil(timer_mult_base - (Math.abs(letter_factor) * timer_mult_base) + (timer_mult_base * 2));
  if (timer_mult === 0) timer_mult = 1;
  //console.log(letter_y_factor);

  letter_x_move = Math.round(letter_factor * letter_x_move_mult);
  letter_y_move = Math.round(letter_factor * letter_y_move_mult);

  letter_x_move = letter_x_move !== 0 ? letter_x_move : 1;
  letter_y_move = letter_y_move !== 0 ? letter_y_move : 1;
}


function calc_move(event_client, offset_position, loc_comp, mult, log=false) {
  let diff = event_client - loc_comp;
  let offset = window[offset_position] - loc_comp;
  let factor = diff / offset;
  let move = Math.round(factor * mult) * -1;
  if (log) {
    console.log(move);
  }
  return [factor, move];
}


var frame_count = 1;

var jiggle_interval = setInterval(jiggle);

function jiggle() {
  if (frame_count >= timer_mult) {
    frame_count = 1;
    for (let letter of letters) {
      let rand = Math.round(Math.random() * 2) - 1;
      let prefix = '';
      if (letter.elem.hasAttribute('cx')) {
        prefix = 'c';
      }
      letter.elem.setAttribute(prefix + 'x', letter.x - ((Math.round(Math.random() * 2) - 1) * letter_x_move));
      letter.elem.setAttribute(prefix + 'y', letter.y - ((Math.round(Math.random() * 2) - 1) * letter_y_move));
    }
  }
  else {
    frame_count++;
  }
}
